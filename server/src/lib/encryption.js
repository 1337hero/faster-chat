import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { config } from "dotenv";

config();

// Encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    "API_KEY_ENCRYPTION_KEY is not set. Generate a 32-byte hex key and set it in the environment before starting the server."
  );
}

const ALGORITHM = "aes-256-gcm";

/**
 * Encrypt an API key
 * @param {string} apiKey - The API key to encrypt
 * @returns {{ encryptedKey: string, iv: string, authTag: string }}
 */
export function encryptApiKey(apiKey) {
  if (!apiKey) {
    throw new Error("API key is required");
  }

  const key = Buffer.from(process.env.API_KEY_ENCRYPTION_KEY, "hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt an API key
 * @param {string} encryptedKey - The encrypted API key
 * @param {string} iv - The initialization vector
 * @param {string} authTag - The authentication tag
 * @returns {string} - The decrypted API key
 */
export function decryptApiKey(encryptedKey, iv, authTag) {
  if (!encryptedKey || !iv || !authTag) {
    throw new Error("Encrypted key, IV, and auth tag are required");
  }

  try {
    const key = Buffer.from(process.env.API_KEY_ENCRYPTION_KEY, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encryptedKey, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error("Failed to decrypt API key: " + error.message);
  }
}

/**
 * Mask an API key for display (show first 7 chars + last 4)
 * @param {string} apiKey - The API key to mask
 * @returns {string} - Masked API key (e.g., "sk-proj...abc123")
 */
export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 12) {
    return "***";
  }

  const start = apiKey.substring(0, 7);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}...${end}`;
}

/**
 * Generate a 32-byte encryption key (for setup)
 * Use this to generate the API_KEY_ENCRYPTION_KEY
 */
export function generateEncryptionKey() {
  return randomBytes(32).toString("hex");
}
