process.env.API_KEY_ENCRYPTION_KEY =
  process.env.API_KEY_ENCRYPTION_KEY ||
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

import { describe, test, expect } from "bun:test";
import {
  encryptApiKey,
  decryptApiKey,
  maskApiKey,
  generateEncryptionKey,
} from "../lib/encryption.js";

describe("encryption", () => {
  describe("encryptApiKey / decryptApiKey", () => {
    test("encrypt produces encryptedKey, iv, authTag (all non-empty)", () => {
      const result = encryptApiKey("sk-test-key-12345");
      expect(result.encryptedKey).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.authTag).toBeTruthy();
    });

    test("encrypt → decrypt roundtrip preserves original value", () => {
      const original = "sk-proj-abc123def456ghi789";
      const { encryptedKey, iv, authTag } = encryptApiKey(original);
      const decrypted = decryptApiKey(encryptedKey, iv, authTag);
      expect(decrypted).toBe(original);
    });

    test("encrypt same key twice produces different ciphertext (random IV)", () => {
      const key = "sk-test-same-key";
      const a = encryptApiKey(key);
      const b = encryptApiKey(key);
      expect(a.encryptedKey).not.toBe(b.encryptedKey);
      expect(a.iv).not.toBe(b.iv);
    });

    test("decrypt with wrong authTag throws", () => {
      const { encryptedKey, iv } = encryptApiKey("sk-test-key");
      const badTag = "00".repeat(16);
      expect(() => decryptApiKey(encryptedKey, iv, badTag)).toThrow();
    });

    test("encrypt empty string throws", () => {
      expect(() => encryptApiKey("")).toThrow("API key is required");
    });

    test("encrypt null/undefined throws", () => {
      expect(() => encryptApiKey(null)).toThrow("API key is required");
      expect(() => encryptApiKey(undefined)).toThrow("API key is required");
    });

    test("decrypt with missing params throws", () => {
      expect(() => decryptApiKey(null, "aa", "bb")).toThrow();
      expect(() => decryptApiKey("aa", null, "bb")).toThrow();
      expect(() => decryptApiKey("aa", "bb", null)).toThrow();
    });
  });

  describe("maskApiKey", () => {
    test("masks long key: first 7 + ... + last 4", () => {
      const masked = maskApiKey("sk-proj-abc123def456");
      expect(masked).toBe("sk-proj...f456");
    });

    test("returns *** for key shorter than 12 chars", () => {
      expect(maskApiKey("short")).toBe("***");
      expect(maskApiKey("12345678901")).toBe("***");
    });

    test("returns *** for null/undefined", () => {
      expect(maskApiKey(null)).toBe("***");
      expect(maskApiKey(undefined)).toBe("***");
    });
  });

  describe("generateEncryptionKey", () => {
    test("returns 64-char hex string", () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    test("generates different keys each call", () => {
      const a = generateEncryptionKey();
      const b = generateEncryptionKey();
      expect(a).not.toBe(b);
    });
  });
});
