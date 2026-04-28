import { randomUUID, createHash } from "crypto";
import { unlink, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  FILE_CONSTANTS,
  FILE_CATEGORIES,
  FILE_STRATEGIES,
  FILE_DOWNLOAD_POLICIES,
  FILE_CATEGORY_DEFINITIONS,
  UNSAFE_INLINE_EXTENSIONS,
  UNSAFE_INLINE_MIME_TYPES,
  PROVIDER_ATTACHMENT_CAPABILITIES,
  getMimeFromExtension,
  formatFileSize,
} from "@faster-chat/shared";
import { extractOfficeText, isOfficeModernFile, isOfficeLegacyFile } from "./officeExtraction.js";
import { providerSupportsImages, providerSupportsNativePdf } from "./providerFactory.js";
import { validateImageDimensions, MAX_IMAGE_DIMENSION_PX } from "./imageValidation.js";

// Phase 3: Text-like attachment inlining limits
export const MAX_INLINE_TEXT_ATTACHMENT_CHARS = 200_000;

export {
  formatFileSize,
  FILE_CATEGORIES,
  FILE_STRATEGIES,
  FILE_DOWNLOAD_POLICIES,
  FILE_CATEGORY_DEFINITIONS,
  UNSAFE_INLINE_EXTENSIONS,
  UNSAFE_INLINE_MIME_TYPES,
  getMimeFromExtension,
} from "@faster-chat/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const UPLOAD_DIR = path.join(PROJECT_ROOT, "server/data/uploads");

export const FILE_CONFIG = {
  MAX_SIZE: FILE_CONSTANTS.MAX_FILE_SIZE_BYTES,
  ALLOWED_TYPES: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/json",
    "application/javascript",
    "text/javascript",
    "text/html",
    "text/css",
    "application/xml",
    "text/xml",
  ],
  UPLOAD_DIR,
};

export async function ensureUploadDirectory() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}

export function generateFileId() {
  return randomUUID();
}

export function sanitizeFilename(filename) {
  let sanitized = filename
    .replace(/[/\\]/g, "")
    .replace(/\u0000/g, "")
    .trim()
    .replace(/^\.+/, "");
  if (!sanitized) {
    sanitized = FILE_CONSTANTS.DEFAULT_FILENAME;
  }
  if (sanitized.length > FILE_CONSTANTS.MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const basename = path.basename(sanitized, ext);
    sanitized = basename.substring(0, FILE_CONSTANTS.MAX_FILENAME_LENGTH - ext.length) + ext;
  }
  return sanitized;
}

export function createStoredFilename(fileId, originalFilename) {
  return `${fileId}_${sanitizeFilename(originalFilename)}`;
}

export function validateFileType(mimeType, allowedTypes = FILE_CONFIG.ALLOWED_TYPES) {
  if (!mimeType) {
    return false;
  }
  const normalized = mimeType.trim().toLowerCase().split(";")[0];
  if (allowedTypes.includes(normalized)) {
    return true;
  }
  const [type] = normalized.split("/");
  return allowedTypes.includes(`${type}/*`);
}

export function validateFileSize(size, maxSize = FILE_CONFIG.MAX_SIZE) {
  return size > 0 && size <= maxSize;
}

export function calculateFileHash(fileBuffer) {
  return createHash("sha256").update(fileBuffer).digest("hex");
}

export async function deleteFileFromDisk(filePath) {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    return error.code === "ENOENT";
  }
}

export function getFileExtension(filename) {
  const ext = path.extname(filename);
  return ext ? ext.substring(1).toLowerCase() : "";
}

export function validateFileAccess(file, user, requireOwnership = true) {
  if (!file) {
    return { authorized: false, reason: "File not found" };
  }
  if (!requireOwnership) {
    return { authorized: true };
  }
  if (file.user_id !== user.id && user.role !== "admin") {
    return { authorized: false, reason: "Access denied" };
  }
  return { authorized: true };
}

export function normalizeMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== "string") {
    return "";
  }
  return mimeType.trim().split(";")[0].trim().toLowerCase();
}

export function isGenericMimeType(mimeType) {
  const normalized = normalizeMimeType(mimeType);
  return (
    !normalized || normalized === "application/octet-stream" || normalized === "binary/octet-stream"
  );
}

export function classifyAttachment({ filename, mimeType }) {
  const extension = getFileExtension(filename);
  const originalMimeType = mimeType || "";
  const normalizedMimeType = normalizeMimeType(originalMimeType);
  const effectiveMimeType = isGenericMimeType(normalizedMimeType)
    ? getMimeFromExtension(filename) || normalizedMimeType
    : normalizedMimeType;

  let category = FILE_CATEGORIES.UNKNOWN_BINARY;
  let uploadAllowed = false;
  let defaultStrategy = FILE_STRATEGIES.REJECT;
  let downloadPolicy = FILE_DOWNLOAD_POLICIES.ATTACHMENT_ONLY;

  for (const [catKey, catDef] of Object.entries(FILE_CATEGORY_DEFINITIONS)) {
    if (catDef.mimeTypes.some((mt) => mt.toLowerCase() === effectiveMimeType.toLowerCase())) {
      category = catKey;
      uploadAllowed = catDef.uploadAllowed;
      defaultStrategy = catDef.defaultStrategy;
      downloadPolicy = catDef.downloadPolicy;
      break;
    }
  }

  if (category === FILE_CATEGORIES.UNKNOWN_BINARY) {
    for (const [catKey, catDef] of Object.entries(FILE_CATEGORY_DEFINITIONS)) {
      if (catDef.extensions.includes(extension)) {
        category = catKey;
        uploadAllowed = catDef.uploadAllowed;
        defaultStrategy = catDef.defaultStrategy;
        downloadPolicy = catDef.downloadPolicy;
        break;
      }
    }
  }

  const overlays = [];
  if (
    UNSAFE_INLINE_EXTENSIONS.includes(extension) ||
    UNSAFE_INLINE_MIME_TYPES.includes(effectiveMimeType.toLowerCase())
  ) {
    overlays.push("unsafeActiveContent");
    downloadPolicy = FILE_DOWNLOAD_POLICIES.TEXT_ATTACHMENT_ONLY;
  }

  return {
    filename,
    extension,
    originalMimeType,
    normalizedMimeType,
    effectiveMimeType,
    category,
    overlays,
    uploadAllowed,
    defaultStrategy,
    downloadPolicy,
  };
}

export function validateFile({ mimeType, size, filename }) {
  const classification = filename ? classifyAttachment({ filename, mimeType }) : null;

  if (classification && !classification.uploadAllowed) {
    return {
      valid: false,
      error: `File type ${mimeType} (${filename}) is not allowed for upload.`,
      classification,
    };
  }

  if (!validateFileType(mimeType)) {
    return {
      valid: false,
      error: classification
        ? `File type ${classification.effectiveMimeType} (${filename}) is not allowed.`
        : `File type ${mimeType} is not allowed.`,
      classification,
    };
  }

  if (!validateFileSize(size)) {
    return {
      valid: false,
      error: `File size ${formatFileSize(size)} exceeds maximum of ${formatFileSize(FILE_CONFIG.MAX_SIZE)}.`,
      classification,
    };
  }

  return { valid: true, classification };
}

export function getMimeTypeFromExtension(filename) {
  const ext = getFileExtension(filename);
  return getMimeFromExtension(ext);
}

export function getAttachmentCategory(file) {
  return (
    file.meta?.attachmentCategory ||
    classifyAttachment({ filename: file.filename, mimeType: file.mime_type }).category
  );
}

/**
 * Get the download policy for a file
 * Uses stored metadata when available, falls back to classification
 */
export function getAttachmentDownloadPolicy(file) {
  return (
    file.meta?.downloadPolicy ||
    classifyAttachment({ filename: file.filename, mimeType: file.mime_type }).downloadPolicy
  );
}

export function isTextLikeAttachment(file) {
  return getAttachmentCategory(file) === FILE_CATEGORIES.TEXT_LIKE;
}

export function isOfficeModernAttachment(file) {
  return getAttachmentCategory(file) === FILE_CATEGORIES.OFFICE_MODERN;
}

export function isOfficeLegacyAttachment(file) {
  return getAttachmentCategory(file) === FILE_CATEGORIES.OFFICE_LEGACY;
}

/**
 * Collect all attachment IDs from a completion request
 * Handles both top-level fileIds and per-message fileIds
 */
export function collectAttachmentIdsFromRequest(validated) {
  const allFileIds = [
    ...new Set([
      ...(validated.fileIds || []),
      ...validated.messages.flatMap((m) => m.fileIds || []),
    ]),
  ];
  return allFileIds;
}

/**
 * Get the appropriate strategy for a category
 */
export function getStrategyForCategory(category) {
  const catDef = FILE_CATEGORY_DEFINITIONS[category];
  return catDef?.defaultStrategy || FILE_STRATEGIES.REJECT;
}

/**
 * Preflight attachments against provider/model capabilities
 * Returns null if all attachments are supported, or an error object with details
 */
export function preflightAttachments({ files, modelRecord, providerName }) {
  const results = [];
  let hasImageDimensionIssue = false;

  // Check each file and collect detailed results
  for (const file of files) {
    const category = getAttachmentCategory(file);
    const extension = getFileExtension(file.filename);

    let allowed = true;
    let reason = "";
    let suggestion = "";
    let warnings = [];

    switch (category) {
      case FILE_CATEGORIES.IMAGE: {
        // Check if provider supports images
        const providerSupportsImg = providerSupportsImages(providerName);
        const modelSupportsImg = modelRecord?.supports_vision || false;

        // Allow image if either:
        // 1. Provider is known to support images, OR
        // 2. Model explicitly supports vision (for generic/openai-compatible providers)
        if (!providerSupportsImg && !modelSupportsImg) {
          allowed = false;
          reason =
            "The selected model cannot read image attachments. Choose a vision-capable model or remove the image.";
          suggestion =
            "Choose a model with vision capabilities (e.g., Claude 3.5 Sonnet, GPT-4 Turbo) or remove the image attachment.";
          hasImageDimensionIssue = true;
        }
        break;
      }

      case FILE_CATEGORIES.PDF: {
        if (!providerSupportsNativePdf(providerName)) {
          allowed = false;
          reason = "The selected provider cannot read PDF attachments directly.";
          suggestion = "Choose Claude, OpenAI, Mistral, or upload a text version.";
        }
        break;
      }

      case FILE_CATEGORIES.TEXT_LIKE: {
        // Always allowed via inlineText strategy
        allowed = true;
        break;
      }

      case FILE_CATEGORIES.OFFICE_MODERN: {
        // Phase 5: Office modern requires extraction
        if (!isOfficeModernFile({ filename: file.filename, mimeType: file.mime_type })) {
          allowed = false;
          reason = "Office document type not recognized.";
          suggestion = "Ensure the file has a .docx, .xlsx, or .pptx extension.";
        }
        break;
      }

      case FILE_CATEGORIES.OFFICE_LEGACY: {
        allowed = false;
        reason = "Legacy Office documents (.doc, .xls, .ppt) are not supported.";
        suggestion = "Save as .docx, .xlsx, .pptx, PDF, CSV, or plain text and upload again.";
        break;
      }

      case FILE_CATEGORIES.UNKNOWN_BINARY: {
        allowed = false;
        reason = "File type is not supported.";
        suggestion = "Upload a supported file type (image, PDF, text-like, or Office document).";
        break;
      }

      default: {
        allowed = false;
        reason = `Unknown attachment category: ${category}`;
        suggestion = "Please contact support if you believe this file type should be supported.";
      }
    }

    results.push({
      fileId: file.id,
      filename: file.filename,
      category,
      strategy: allowed ? getStrategyForCategory(category) : FILE_STRATEGIES.REJECT,
      allowed,
      reason,
      suggestion,
      warnings,
    });
  }

  // Check if any file is not allowed
  const denied = results.filter((r) => !r.allowed);
  if (denied.length > 0) {
    // Determine the error code based on the most severe issue
    let errorCode = "ATTACHMENT_UNSUPPORTED";
    for (const d of denied) {
      if (d.category === FILE_CATEGORIES.OFFICE_LEGACY) {
        errorCode = "ATTACHMENT_PROVIDER_UNSUPPORTED";
        break;
      }
      if (hasImageDimensionIssue) {
        errorCode = "ATTACHMENT_IMAGE_DIMENSIONS";
        break;
      }
    }

    return {
      ok: false,
      results,
      code: errorCode,
      error: "One or more attachments are not supported by the selected model.",
      details: denied.map((d) => ({
        filename: d.filename,
        category: d.category,
        reason: d.reason,
        suggestion: d.suggestion,
      })),
    };
  }

  return {
    ok: true,
    results,
  };
}

/**
 * Phase 5: Extract text from Office documents
 */
export async function extractOfficeDocumentText(file) {
  const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
  const fileBuffer = await readFile(filePath).catch((err) => {
    throw new Error(`Cannot read ${file.id} at ${filePath}: ${err.message}`);
  });

  return extractOfficeText({
    buffer: fileBuffer,
    filename: file.filename,
    mimeType: file.mime_type,
  });
}

export { extractOfficeText, isOfficeModernFile, isOfficeLegacyFile };

const FENCE_LANGUAGE_MAP = {
  markdown: "markdown",
  json: "json",
  csv: "csv",
  html: "html",
  xml: "xml",
  yaml: "yaml",
  javascript: "javascript",
  css: "css",
};

export function formatInlineAttachmentText({ filename, mimeType, size, text, totalCharCount }) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const extension = getFileExtension(filename);

  const fenceLanguage =
    Object.entries(FENCE_LANGUAGE_MAP).find(([mime]) => normalizedMimeType.includes(mime))?.[1] ??
    extension ??
    "txt";

  const header = `Attached file: ${filename}\nContent-Type: ${normalizedMimeType}\nSize: ${formatFileSize(size)}\n\n`;
  const codeBlock = `\`\`\`${fenceLanguage}\n${text}\n\`\`\``;
  const truncationNotice =
    totalCharCount && totalCharCount > text.length
      ? `\n\n[Attachment truncated: showing first ${text.length} characters of ${totalCharCount} characters]`
      : "";

  return header + codeBlock + truncationNotice;
}
