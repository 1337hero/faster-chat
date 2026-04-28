// Phase 1: Attachment Capability Model Constants

export const FILE_CATEGORIES = {
  IMAGE: "image",
  PDF: "pdf",
  TEXT_LIKE: "textLike",
  OFFICE_MODERN: "officeModern",
  OFFICE_LEGACY: "officeLegacy",
  UNKNOWN_BINARY: "unknownBinary",
};

export const FILE_STRATEGIES = {
  NATIVE_IMAGE: "nativeImage",
  NATIVE_PDF: "nativePdf",
  INLINE_TEXT: "inlineText",
  INLINE_OFFICE_TEXT: "inlineOfficeText",
  REJECT: "reject",
};

export const FILE_DOWNLOAD_POLICIES = {
  INLINE_SAFE: "inlineSafe",
  ATTACHMENT_ONLY: "attachmentOnly",
  TEXT_ATTACHMENT_ONLY: "textAttachmentOnly",
};

// Single source: extension → MIME type mapping
const EXTENSION_TO_MIME = {
  // Images
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  // Documents
  pdf: "application/pdf",
  // Text
  txt: "text/plain", md: "text/markdown", markdown: "text/markdown", csv: "text/csv",
  json: "application/json", jsonl: "application/json", ndjson: "application/json",
  html: "text/html", htm: "text/html", xml: "application/xml", css: "text/css",
  js: "application/javascript", mjs: "application/javascript", cjs: "application/javascript",
  log: "text/plain", yaml: "application/yaml", yml: "application/yaml",
  // Office
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Legacy
  doc: "application/msword", xls: "application/vnd.ms-excel", ppt: "application/vnd.ms-powerpoint",
};

// Generate MIME type arrays from extension mappings
function mimesForExtensions(exts) {
  return [...new Set(exts.map(e => EXTENSION_TO_MIME[e]).filter(Boolean))];
}

export const FILE_CATEGORY_DEFINITIONS = {
  [FILE_CATEGORIES.IMAGE]: {
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
    mimeTypes: mimesForExtensions(["jpg", "jpeg", "png", "gif", "webp", "svg"]),
    uploadAllowed: true,
    defaultStrategy: FILE_STRATEGIES.NATIVE_IMAGE,
    downloadPolicy: FILE_DOWNLOAD_POLICIES.INLINE_SAFE,
  },
  [FILE_CATEGORIES.PDF]: {
    extensions: ["pdf"],
    mimeTypes: mimesForExtensions(["pdf"]),
    uploadAllowed: true,
    defaultStrategy: FILE_STRATEGIES.NATIVE_PDF,
    downloadPolicy: FILE_DOWNLOAD_POLICIES.INLINE_SAFE,
  },
  [FILE_CATEGORIES.TEXT_LIKE]: {
    extensions: ["txt", "md", "markdown", "csv", "json", "jsonl", "ndjson", "html", "htm", "xml", "js", "mjs", "cjs", "css", "log", "yaml", "yml"],
    mimeTypes: mimesForExtensions(["txt", "md", "markdown", "csv", "json", "jsonl", "ndjson", "html", "htm", "xml", "js", "mjs", "cjs", "css", "log", "yaml", "yml"]),
    uploadAllowed: true,
    defaultStrategy: FILE_STRATEGIES.INLINE_TEXT,
    downloadPolicy: FILE_DOWNLOAD_POLICIES.INLINE_SAFE,
  },
  [FILE_CATEGORIES.OFFICE_MODERN]: {
    extensions: ["docx", "xlsx", "pptx"],
    mimeTypes: mimesForExtensions(["docx", "xlsx", "pptx"]),
    uploadAllowed: true,
    defaultStrategy: FILE_STRATEGIES.INLINE_OFFICE_TEXT,
    downloadPolicy: FILE_DOWNLOAD_POLICIES.ATTACHMENT_ONLY,
  },
  [FILE_CATEGORIES.OFFICE_LEGACY]: {
    extensions: ["doc", "xls", "ppt"],
    mimeTypes: mimesForExtensions(["doc", "xls", "ppt"]),
    uploadAllowed: false,
    defaultStrategy: FILE_STRATEGIES.REJECT,
    downloadPolicy: FILE_DOWNLOAD_POLICIES.ATTACHMENT_ONLY,
  },
};

export const UNSAFE_INLINE_EXTENSIONS = ["html", "htm", "svg", "js", "mjs", "cjs", "xml"];
export const UNSAFE_INLINE_MIME_TYPES = ["text/html", "image/svg+xml", "application/javascript", "text/javascript", "application/xml", "text/xml"];

export const PROVIDER_ATTACHMENT_CAPABILITIES = {
  anthropic: { images: true, pdfs: true, textStrategy: FILE_STRATEGIES.INLINE_TEXT },
  openai: { images: true, pdfs: true, textStrategy: FILE_STRATEGIES.INLINE_TEXT },
  mistral: { images: true, pdfs: true, textStrategy: FILE_STRATEGIES.INLINE_TEXT },
  groq: { images: true, pdfs: false, textStrategy: FILE_STRATEGIES.INLINE_TEXT },
  cohere: { images: false, pdfs: false, textStrategy: FILE_STRATEGIES.INLINE_TEXT },
};

export const FILE_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  BYTES_PER_KB: 1024,
  MAX_FILENAME_LENGTH: 255,
  DEFAULT_FILENAME: "unnamed_file",
  ERROR_DISPLAY_DURATION_MS: 5000,
  SIZE_UNITS: ["Bytes", "KB", "MB", "GB"],
};

export function getMimeFromExtension(ext) {
  return EXTENSION_TO_MIME[ext.toLowerCase()] || null;
}
