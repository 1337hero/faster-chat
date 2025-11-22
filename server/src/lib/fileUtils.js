import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { unlink, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { FILE_CONSTANTS, formatFileSize } from "@faster-chat/shared";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve upload directory relative to project root
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const UPLOAD_DIR = path.join(PROJECT_ROOT, "server/data/uploads");

export const FILE_CONFIG = {
  MAX_SIZE: FILE_CONSTANTS.MAX_FILE_SIZE_BYTES,
  ALLOWED_TYPES: [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // Documents
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    // Office documents
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    // Code files
    "application/json",
    "application/javascript",
    "text/javascript",
    "text/html",
    "text/css",
    "application/xml",
    "text/xml",
  ],
  UPLOAD_DIR: UPLOAD_DIR,
};

/**
 * Ensure upload directory exists
 */
export async function ensureUploadDirectory() {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error("Failed to create upload directory:", error);
      throw error;
    }
  }
}

/**
 * Generate a unique file ID (UUID v4)
 * @returns {string} UUID
 */
export function generateFileId() {
  return randomUUID();
}

export function sanitizeFilename(filename) {
  let sanitized = filename.replace(/[\/\\]/g, "");
  sanitized = sanitized.replace(/\0/g, "");
  sanitized = sanitized.trim().replace(/^\.+/, "");

  if (!sanitized) {
    sanitized = FILE_CONSTANTS.DEFAULT_FILENAME;
  }

  const maxLength = FILE_CONSTANTS.MAX_FILENAME_LENGTH;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const basename = path.basename(sanitized, ext);
    sanitized = basename.substring(0, maxLength - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Create stored filename with UUID prefix
 * @param {string} fileId - UUID for the file
 * @param {string} originalFilename - Original filename
 * @returns {string} Stored filename ({uuid}_{sanitized_filename})
 */
export function createStoredFilename(fileId, originalFilename) {
  const sanitized = sanitizeFilename(originalFilename);
  return `${fileId}_${sanitized}`;
}

/**
 * Validate file type against allowed MIME types
 * @param {string} mimeType - MIME type to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types (optional, uses default if not provided)
 * @returns {boolean} True if valid
 */
export function validateFileType(mimeType, allowedTypes = FILE_CONFIG.ALLOWED_TYPES) {
  if (!mimeType) return false;

  // Check exact match
  if (allowedTypes.includes(mimeType)) {
    return true;
  }

  // Check wildcard patterns (e.g., "image/*")
  const [type, subtype] = mimeType.split("/");
  const wildcardPattern = `${type}/*`;
  return allowedTypes.includes(wildcardPattern);
}

/**
 * Validate file size against maximum allowed size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes (optional, uses default if not provided)
 * @returns {boolean} True if valid
 */
export function validateFileSize(size, maxSize = FILE_CONFIG.MAX_SIZE) {
  return size > 0 && size <= maxSize;
}

/**
 * Calculate SHA-256 hash of file contents
 * @param {Buffer} fileBuffer - File contents as buffer
 * @returns {string} SHA-256 hash
 */
export function calculateFileHash(fileBuffer) {
  const hash = createHash("sha256");
  hash.update(fileBuffer);
  return hash.digest("hex");
}

/**
 * Delete file from disk
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteFileFromDisk(filePath) {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist, consider it deleted
      return true;
    }
    console.error("Error deleting file:", error);
    return false;
  }
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} Extension (without dot)
 */
export function getFileExtension(filename) {
  const ext = path.extname(filename);
  return ext ? ext.substring(1).toLowerCase() : "";
}

export { formatFileSize };

export function validateFileAccess(file, user, requireOwnership = true) {
  if (!file) {
    return { authorized: false, reason: "File not found" };
  }

  if (!requireOwnership) {
    return { authorized: true };
  }

  const isOwner = file.user_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    return { authorized: false, reason: "Access denied" };
  }

  return { authorized: true };
}

/**
 * Validate file completely (type and size)
 * @param {string} mimeType - MIME type
 * @param {number} size - File size in bytes
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateFile(mimeType, size) {
  if (!validateFileType(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not allowed. Allowed types: images, PDFs, text files, and office documents.`,
    };
  }

  if (!validateFileSize(size)) {
    return {
      valid: false,
      error: `File size ${formatFileSize(size)} exceeds maximum allowed size of ${formatFileSize(
        FILE_CONFIG.MAX_SIZE
      )}.`,
    };
  }

  return { valid: true };
}

/**
 * Get MIME type from file extension (basic mapping)
 * @param {string} filename - Filename
 * @returns {string|null} MIME type or null if unknown
 */
export function getMimeTypeFromExtension(filename) {
  const ext = getFileExtension(filename);
  const mimeMap = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    // Documents
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    // Office
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Code
    json: "application/json",
    js: "application/javascript",
    html: "text/html",
    css: "text/css",
    xml: "application/xml",
  };

  return mimeMap[ext] || null;
}
