#!/usr/bin/env bun
/**
 * Initialization script for Faster Chat
 *
 * This script runs before the server starts to:
 * - Generate encryption key if missing
 * - Ensure required directories exist
 * - Validate environment setup
 */

import { randomBytes } from "crypto";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { cwd } from "process";

// Get paths relative to current working directory (should be /app/server in Docker or server/ locally)
const serverRoot = cwd();
const envPath = join(serverRoot, ".env");
const dataDir = join(serverRoot, "data");
const uploadsDir = join(dataDir, "uploads");

console.log("🚀 Initializing Faster Chat...\n");

// 1. Ensure data directories exist
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log("✅ Created data directory");
}

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// 2. Generate encryption key if missing
let keyGenerated = false;

if (!existsSync(envPath)) {
  console.log("🔑 No .env file found, creating one...");

  const encryptionKey = randomBytes(32).toString("hex");
  const envContent = `# Auto-generated encryption key for API keys storage
# DO NOT commit this file to version control!
# DO NOT lose this key - you won't be able to decrypt stored API keys!

API_KEY_ENCRYPTION_KEY=${encryptionKey}
`;

  writeFileSync(envPath, envContent, { mode: 0o600 }); // Secure file permissions
  console.log("✅ Generated new encryption key in server/.env");
  keyGenerated = true;
} else {
  // Check if encryption key exists in .env
  const envContent = Bun.file(envPath).text();
  const hasKey = (await envContent).includes("API_KEY_ENCRYPTION_KEY=");

  if (!hasKey) {
    console.log("⚠️  .env exists but missing API_KEY_ENCRYPTION_KEY");
    console.log("🔑 Appending encryption key to existing .env...");

    const encryptionKey = randomBytes(32).toString("hex");
    const envAppend = `\n# Auto-generated encryption key\nAPI_KEY_ENCRYPTION_KEY=${encryptionKey}\n`;

    writeFileSync(envPath, (await envContent) + envAppend, { mode: 0o600 });
    console.log("✅ Added encryption key to server/.env");
    keyGenerated = true;
  } else {
    console.log("✅ Encryption key already configured");
  }
}

// 3. Security warning if key was just generated
if (keyGenerated) {
  console.log("\n⚠️  IMPORTANT SECURITY NOTICE:");
  console.log("   • Backup your server/.env file - you'll need it to decrypt API keys");
  console.log("   • Never commit this file to git (already in .gitignore)");
  console.log("   • If you lose this key, you'll need to re-add all provider API keys\n");
}

console.log("✨ Initialization complete!\n");
