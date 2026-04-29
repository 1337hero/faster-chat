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
  getMimeFromExtension,
  formatFileSize,
} from "@faster-chat/shared";
import { extractOfficeText, isOfficeModernFile, isOfficeLegacyFile } from "./officeExtraction.js";
import { providerSupportsImages, providerSupportsNativePdf } from "./providerFactory.js";
import { validateImageDimensions, MAX_IMAGE_DIMENSION_PX } from "./imageValidation.js";

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
  if (!filename) {
    return { valid: false, error: "Filename is required.", classification: null };
  }

  const classification = classifyAttachment({ filename, mimeType });

  // Reject images carrying the unsafeActiveContent overlay (SVG today).
  const isUnsafeImage =
    classification.category === FILE_CATEGORIES.IMAGE &&
    classification.overlays.includes("unsafeActiveContent");

  if (!classification.uploadAllowed || isUnsafeImage) {
    return {
      valid: false,
      error: `File type ${classification.effectiveMimeType || mimeType} (${filename}) is not allowed for upload.`,
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

export function getAttachmentCategory(file) {
  return (
    file.meta?.attachmentCategory ||
    classifyAttachment({ filename: file.filename, mimeType: file.mime_type }).category
  );
}

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

export function getStrategyForCategory(category) {
  const catDef = FILE_CATEGORY_DEFINITIONS[category];
  return catDef?.defaultStrategy || FILE_STRATEGIES.REJECT;
}

async function classifyForModel(file, modelRecord, providerName) {
  const category = getAttachmentCategory(file);

  switch (category) {
    case FILE_CATEGORIES.IMAGE: {
      const providerSupports = providerSupportsImages(providerName);
      const modelSupports = !!modelRecord?.supports_vision;
      if (!providerSupports && !modelSupports) {
        return {
          category,
          allowed: false,
          errorCode: "ATTACHMENT_UNSUPPORTED",
          reason:
            "The selected model cannot read image attachments. Choose a vision-capable model or remove the image.",
          suggestion:
            "Choose a model with vision capabilities (e.g., Claude 3.5 Sonnet, GPT-4 Turbo) or remove the image attachment.",
        };
      }
      try {
        const buf = await readFile(path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename));
        validateImageDimensions(buf, file.mime_type, file.filename);
      } catch (err) {
        return {
          category,
          allowed: false,
          errorCode: "ATTACHMENT_IMAGE_DIMENSIONS",
          reason: err.message,
          suggestion: `Resize "${file.filename}" so neither side exceeds ${MAX_IMAGE_DIMENSION_PX} px and re-upload.`,
        };
      }
      return { category, allowed: true };
    }

    case FILE_CATEGORIES.PDF:
      return providerSupportsNativePdf(providerName)
        ? { category, allowed: true }
        : {
            category,
            allowed: false,
            errorCode: "ATTACHMENT_PROVIDER_UNSUPPORTED",
            reason: `${providerName} does not support PDFs. Switch models and try again.`,
            suggestion: `Claude, GPT-4o, Gemini, and Mistral support PDFs.`,
          };

    case FILE_CATEGORIES.TEXT_LIKE:
      return { category, allowed: true };

    case FILE_CATEGORIES.OFFICE_MODERN:
      return isOfficeModernFile({ filename: file.filename, mimeType: file.mime_type })
        ? { category, allowed: true }
        : {
            category,
            allowed: false,
            errorCode: "ATTACHMENT_UNSUPPORTED",
            reason: "Office document type not recognized.",
            suggestion: "Ensure the file has a .docx, .xlsx, or .pptx extension.",
          };

    case FILE_CATEGORIES.OFFICE_LEGACY:
      return {
        category,
        allowed: false,
        errorCode: "ATTACHMENT_PROVIDER_UNSUPPORTED",
        reason: "Legacy Office documents (.doc, .xls, .ppt) are not supported.",
        suggestion: "Save as .docx, .xlsx, .pptx, PDF, CSV, or plain text and upload again.",
      };

    case FILE_CATEGORIES.UNKNOWN_BINARY:
    default:
      return {
        category,
        allowed: false,
        errorCode: "ATTACHMENT_UNSUPPORTED",
        reason: "File type is not supported.",
        suggestion: "Upload a supported file type (image, PDF, text-like, or Office document).",
      };
  }
}

export async function preflightAttachments({ files, modelRecord, providerName }) {
  const results = await Promise.all(
    files.map(async (file) => {
      const r = await classifyForModel(file, modelRecord, providerName);
      return {
        fileId: file.id,
        filename: file.filename,
        category: r.category,
        strategy: r.allowed ? getStrategyForCategory(r.category) : FILE_STRATEGIES.REJECT,
        allowed: r.allowed,
        reason: r.reason ?? "",
        suggestion: r.suggestion ?? "",
        errorCode: r.errorCode,
      };
    })
  );

  const denied = results.filter((r) => !r.allowed);
  if (denied.length === 0) {
    return { ok: true, results };
  }

  return {
    ok: false,
    results,
    code: denied[0].errorCode,
    error: "One or more attachments are not supported by the selected model.",
    details: denied.map(({ filename, category, reason, suggestion }) => ({
      filename,
      category,
      reason,
      suggestion,
    })),
  };
}

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
