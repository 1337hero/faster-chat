import { describe, test, expect } from "bun:test";
import {
  sanitizeFilename,
  createStoredFilename,
  validateFileType,
  validateFileSize,
  calculateFileHash,
  validateFileAccess,
  validateFile,
  getMimeTypeFromExtension,
  getFileExtension,
  normalizeMimeType,
  isGenericMimeType,
  classifyAttachment,
} from "../lib/fileUtils.js";
import {
  FILE_CATEGORIES,
  FILE_STRATEGIES,
  FILE_DOWNLOAD_POLICIES,
  UNSAFE_INLINE_EXTENSIONS,
  FILE_CONSTANTS,
} from "@faster-chat/shared";

describe("fileUtils", () => {
  describe("sanitizeFilename", () => {
    test("strips forward slashes", () => {
      expect(sanitizeFilename("path/to/file.txt")).toBe("pathtofile.txt");
    });

    test("strips backslashes", () => {
      expect(sanitizeFilename("path\\to\\file.txt")).toBe("pathtofile.txt");
    });

    test("strips null bytes", () => {
      expect(sanitizeFilename("file\0name.txt")).toBe("filename.txt");
    });

    test("strips leading dots", () => {
      expect(sanitizeFilename("..hidden")).toBe("hidden");
      expect(sanitizeFilename(".env")).toBe("env");
    });

    test("returns 'unnamed_file' for empty input", () => {
      expect(sanitizeFilename("")).toBe("unnamed_file");
    });

    test("returns 'unnamed_file' for only-dots input", () => {
      expect(sanitizeFilename("...")).toBe("unnamed_file");
    });

    test("truncates to 255 chars preserving extension", () => {
      const longName = "a".repeat(260) + ".txt";
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith(".txt")).toBe(true);
    });
  });

  describe("createStoredFilename", () => {
    test("prepends fileId with underscore", () => {
      const id = "abc-123";
      const result = createStoredFilename(id, "photo.png");
      expect(result).toBe("abc-123_photo.png");
    });
  });

  describe("validateFileType", () => {
    test("accepts allowed MIME type (image/png)", () => {
      expect(validateFileType("image/png")).toBe(true);
    });

    test("accepts allowed MIME type (application/pdf)", () => {
      expect(validateFileType("application/pdf")).toBe(true);
    });

    test("rejects disallowed type (application/exe)", () => {
      expect(validateFileType("application/exe")).toBe(false);
    });

    test("rejects image/svg+xml (not in allowed list)", () => {
      expect(validateFileType("image/svg+xml")).toBe(false);
    });

    test("rejects null/undefined mimeType", () => {
      expect(validateFileType(null)).toBe(false);
      expect(validateFileType(undefined)).toBe(false);
    });

    test("supports wildcard patterns (image/*)", () => {
      expect(validateFileType("image/png", ["image/*"])).toBe(true);
      expect(validateFileType("image/jpeg", ["image/*"])).toBe(true);
      expect(validateFileType("text/plain", ["image/*"])).toBe(false);
    });
  });

  describe("validateFileSize", () => {
    test("accepts file within limit", () => {
      expect(validateFileSize(1024)).toBe(true);
      expect(validateFileSize(10 * 1024 * 1024)).toBe(true);
    });

    test("rejects file over limit", () => {
      expect(validateFileSize(10 * 1024 * 1024 + 1)).toBe(false);
    });

    test("rejects zero-byte file", () => {
      expect(validateFileSize(0)).toBe(false);
    });

    test("rejects negative size", () => {
      expect(validateFileSize(-1)).toBe(false);
    });
  });

  describe("calculateFileHash", () => {
    test("returns consistent SHA-256 hex for same input", () => {
      const buf = Buffer.from("hello world");
      const hash1 = calculateFileHash(buf);
      const hash2 = calculateFileHash(buf);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    test("returns different hash for different input", () => {
      const a = calculateFileHash(Buffer.from("hello"));
      const b = calculateFileHash(Buffer.from("world"));
      expect(a).not.toBe(b);
    });
  });

  describe("validateFileAccess", () => {
    const owner = { id: "user-1", role: "user" };
    const admin = { id: "user-2", role: "admin" };
    const other = { id: "user-3", role: "user" };
    const file = { user_id: "user-1" };

    test("allows owner access", () => {
      expect(validateFileAccess(file, owner)).toEqual({ authorized: true });
    });

    test("allows admin access to any file", () => {
      expect(validateFileAccess(file, admin)).toEqual({ authorized: true });
    });

    test("denies non-owner non-admin", () => {
      const result = validateFileAccess(file, other);
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe("Access denied");
    });

    test("returns 'File not found' for null file", () => {
      const result = validateFileAccess(null, owner);
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe("File not found");
    });

    test("allows any user when requireOwnership is false", () => {
      expect(validateFileAccess(file, other, false)).toEqual({
        authorized: true,
      });
    });
  });

  describe("validateFile", () => {
    test("accepts valid image file", () => {
      const result = validateFile({ mimeType: "image/png", size: 1024, filename: "photo.png" });
      expect(result.valid).toBe(true);
      expect(result.classification.category).toBe(FILE_CATEGORIES.IMAGE);
    });

    test("rejects legacy .doc file", () => {
      const result = validateFile({
        mimeType: "application/msword",
        size: 1024,
        filename: "report.doc",
      });
      expect(result.valid).toBe(false);
      expect(result.classification.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
      expect(result.classification.uploadAllowed).toBe(false);
    });

    test("rejects unknown binary file", () => {
      const result = validateFile({
        mimeType: "application/octet-stream",
        size: 1024,
        filename: "file.bin",
      });
      expect(result.valid).toBe(false);
      expect(result.classification.category).toBe(FILE_CATEGORIES.UNKNOWN_BINARY);
    });

    test("returns classification for SVG even though rejected by validateFileType", () => {
      const result = validateFile({ mimeType: "image/svg+xml", size: 1024, filename: "icon.svg" });
      expect(result.valid).toBe(false);
      expect(result.classification.category).toBe(FILE_CATEGORIES.IMAGE);
      expect(result.classification.overlays).toContain("unsafeActiveContent");
    });

    test("accepts valid text file with parameterized MIME", () => {
      const result = validateFile({
        mimeType: "text/plain;charset=utf-8",
        size: 1024,
        filename: "data.txt",
      });
      expect(result.valid).toBe(true);
      expect(result.classification.effectiveMimeType).toBe("text/plain");
      expect(result.classification.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
    });

    test("returns error without filename when classification not provided", () => {
      const result = validateFile({ mimeType: "application/exe", size: 1024 });
      expect(result.valid).toBe(false);
      expect(result.classification).toBeNull();
      expect(result.error).toContain("not allowed");
    });
  });

  describe("getMimeTypeFromExtension", () => {
    test("maps .jpg to image/jpeg", () => {
      expect(getMimeTypeFromExtension("photo.jpg")).toBe("image/jpeg");
    });

    test("maps .pdf to application/pdf", () => {
      expect(getMimeTypeFromExtension("doc.pdf")).toBe("application/pdf");
    });

    test("returns null for unknown extension (.xyz)", () => {
      expect(getMimeTypeFromExtension("file.xyz")).toBeNull();
    });
  });

  describe("getFileExtension", () => {
    test("returns extension without dot", () => {
      expect(getFileExtension("photo.jpg")).toBe("jpg");
    });

    test("returns empty string for no extension", () => {
      expect(getFileExtension("README")).toBe("");
    });
  });

  describe("normalizeMimeType", () => {
    test("handles text/html with charset parameter", () => {
      expect(normalizeMimeType("text/html;charset=utf-8")).toBe("text/html");
    });

    test("handles Text/CSV with mixed case and charset", () => {
      expect(normalizeMimeType("Text/CSV ; Charset=UTF-8")).toBe("text/csv");
    });

    test("handles application/json with leading space", () => {
      expect(normalizeMimeType(" application/json ")).toBe("application/json");
    });

    test("returns empty string for null", () => {
      expect(normalizeMimeType(null)).toBe("");
    });

    test("returns empty string for undefined", () => {
      expect(normalizeMimeType(undefined)).toBe("");
    });

    test("returns empty string for empty string", () => {
      expect(normalizeMimeType("")).toBe("");
    });

    test("returns base MIME without parameters", () => {
      expect(normalizeMimeType("application/pdf; length=12345")).toBe("application/pdf");
    });
  });

  describe("isGenericMimeType", () => {
    test("identifies empty string as generic", () => {
      expect(isGenericMimeType("")).toBe(true);
    });

    test("identifies application/octet-stream as generic", () => {
      expect(isGenericMimeType("application/octet-stream")).toBe(true);
    });

    test("identifies binary/octet-stream as generic", () => {
      expect(isGenericMimeType("binary/octet-stream")).toBe(true);
    });

    test("does not identify image/png as generic", () => {
      expect(isGenericMimeType("image/png")).toBe(false);
    });

    test("does not identify text/plain as generic", () => {
      expect(isGenericMimeType("text/plain")).toBe(false);
    });
  });

  describe("classifyAttachment", () => {
    test("classifies text/html with charset as textLike + unsafe overlay", () => {
      const result = classifyAttachment({
        filename: "fleet.html",
        mimeType: "text/html;charset=utf-8",
      });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
      expect(result.effectiveMimeType).toBe("text/html");
      expect(result.overlays).toContain("unsafeActiveContent");
      expect(result.uploadAllowed).toBe(true);
      expect(result.downloadPolicy).toBe(FILE_DOWNLOAD_POLICIES.TEXT_ATTACHMENT_ONLY);
    });

    test("classifies .csv with application/octet-stream as textLike", () => {
      const result = classifyAttachment({
        filename: "data.csv",
        mimeType: "application/octet-stream",
      });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
      expect(result.extension).toBe("csv");
      expect(result.uploadAllowed).toBe(true);
      expect(result.overlays).not.toContain("unsafeActiveContent");
    });

    test("classifies .doc with application/msword as officeLegacy", () => {
      const result = classifyAttachment({ filename: "report.doc", mimeType: "application/msword" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_LEGACY);
      expect(result.uploadAllowed).toBe(false);
      expect(result.defaultStrategy).toBe(FILE_STRATEGIES.REJECT);
    });

    test("classifies unknown binary file as unknownBinary", () => {
      const result = classifyAttachment({
        filename: "file.bin",
        mimeType: "application/octet-stream",
      });
      expect(result.category).toBe(FILE_CATEGORIES.UNKNOWN_BINARY);
      expect(result.uploadAllowed).toBe(false);
    });

    test("classifies image/jpeg correctly", () => {
      const result = classifyAttachment({ filename: "photo.jpg", mimeType: "image/jpeg" });
      expect(result.category).toBe(FILE_CATEGORIES.IMAGE);
      expect(result.uploadAllowed).toBe(true);
      expect(result.defaultStrategy).toBe(FILE_STRATEGIES.NATIVE_IMAGE);
    });

    test("classifies application/pdf correctly", () => {
      const result = classifyAttachment({ filename: "document.pdf", mimeType: "application/pdf" });
      expect(result.category).toBe(FILE_CATEGORIES.PDF);
      expect(result.uploadAllowed).toBe(true);
      expect(result.defaultStrategy).toBe(FILE_STRATEGIES.NATIVE_PDF);
    });

    test("classifies .md as textLike", () => {
      const result = classifyAttachment({ filename: "readme.md", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
      expect(result.extension).toBe("md");
    });

    test("classifies .jsonl as textLike", () => {
      const result = classifyAttachment({ filename: "data.jsonl", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
      expect(result.extension).toBe("jsonl");
    });

    test("classifies .log as textLike", () => {
      const result = classifyAttachment({ filename: "app.log", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
    });

    test("classifies .yaml as textLike", () => {
      const result = classifyAttachment({ filename: "config.yaml", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
    });

    test("classifies .htm as unsafeActiveContent", () => {
      const result = classifyAttachment({ filename: "page.htm", mimeType: "text/html" });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
      expect(result.overlays).toContain("unsafeActiveContent");
    });

    test("classifies .js as unsafeActiveContent", () => {
      const result = classifyAttachment({
        filename: "script.js",
        mimeType: "application/javascript",
      });
      expect(result.category).toBe(FILE_CATEGORIES.TEXT_LIKE);
      expect(result.overlays).toContain("unsafeActiveContent");
    });

    test("classifies .svg as image + unsafeActiveContent overlay", () => {
      const result = classifyAttachment({ filename: "icon.svg", mimeType: "image/svg+xml" });
      expect(result.category).toBe(FILE_CATEGORIES.IMAGE);
      expect(result.effectiveMimeType).toBe("image/svg+xml");
      expect(result.overlays).toContain("unsafeActiveContent");
    });

    test("classifies .docx as officeModern", () => {
      const result = classifyAttachment({ filename: "report.docx", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
      expect(result.uploadAllowed).toBe(true);
    });

    test("classifies .xlsx as officeModern", () => {
      const result = classifyAttachment({ filename: "sheet.xlsx", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });

    test("classifies .pptx as officeModern", () => {
      const result = classifyAttachment({ filename: "slides.pptx", mimeType: "" });
      expect(result.category).toBe(FILE_CATEGORIES.OFFICE_MODERN);
    });
  });
});
