import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { unlink, mkdir } from "fs/promises";
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

// Phase 3: Text-like attachment inlining limits
export const MAX_INLINE_TEXT_ATTACHMENT_CHARS = 200_000;

export { formatFileSize } from "@faster-chat/shared";

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
    if (error.code !== "EEXIST") throw error;
  }
}

export function generateFileId() {
  return randomUUID();
}

export function sanitizeFilename(filename) {
  let sanitized = filename
    .replace(/[\/\\]/g, "")
    .replace(/\0/g, "")
    .trim()
    .replace(/^\.+/, "");
  if (!sanitized) sanitized = FILE_CONSTANTS.DEFAULT_FILENAME;
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
  if (!mimeType) return false;
  const normalized = mimeType.trim().toLowerCase().split(";")[0];
  if (allowedTypes.includes(normalized)) return true;
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
  if (!file) return { authorized: false, reason: "File not found" };
  if (!requireOwnership) return { authorized: true };
  if (file.user_id !== user.id && user.role !== "admin")
    return { authorized: false, reason: "Access denied" };
  return { authorized: true };
}

export function normalizeMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== "string") return "";
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

/**
 * Phase 3: Detect if file is text-like (should be converted to text part)
 */
export function isTextLikeAttachment(file) {
  const category =
    file.meta?.attachmentCategory ||
    classifyAttachment({ filename: file.filename, mimeType: file.mime_type }).category;
  return category === FILE_CATEGORIES.TEXT_LIKE;
}

export function decodeAttachmentText(buffer) {
  return { text: buffer.toString("utf8") };
}

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
