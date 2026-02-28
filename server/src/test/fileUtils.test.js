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
} from "../lib/fileUtils.js";

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
    test("returns { valid: true } for good file", () => {
      expect(validateFile("image/png", 1024)).toEqual({ valid: true });
    });

    test("returns error for bad type", () => {
      const result = validateFile("application/exe", 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    test("returns error for bad size", () => {
      const result = validateFile("image/png", 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds");
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
});
