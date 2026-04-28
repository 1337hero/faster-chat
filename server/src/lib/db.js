import { Database } from "bun:sqlite";
import { randomBytes } from "crypto";
import { config } from "dotenv";
import { DB_CONSTANTS } from "@faster-chat/shared";
import { encryptApiKey, decryptApiKey } from "./encryption.js";
import { createAuditUtils } from "./db/audit.js";
import { createChatUtils } from "./db/chats.js";
import { createFileUtils } from "./db/files.js";
import { createFolderUtils } from "./db/folders.js";
import { createMemoryUtils } from "./db/memory.js";
import { createModelUtils } from "./db/models.js";
import { migrations } from "./db/migrations/index.js";
import { createProviderUtils } from "./db/providers.js";
import { createSettingUtils } from "./db/settings.js";
import { createUserUtils } from "./db/users.js";

config();

const dbPath = process.env.DATABASE_URL?.replace("sqlite://", "") || "./data/chat.db";
const db = new Database(dbPath);

db.exec("PRAGMA foreign_keys = ON");

if (process.env.NODE_ENV === "production") {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(`PRAGMA cache_size = ${DB_CONSTANTS.CACHE_SIZE_PAGES}`);
  db.exec("PRAGMA temp_store = MEMORY");
  db.exec(`PRAGMA mmap_size = ${DB_CONSTANTS.MMAP_SIZE_BYTES}`);
}

function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);
  const applied = new Set(
    database
      .prepare("SELECT id FROM schema_migrations")
      .all()
      .map((row) => row.id)
  );
  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    database.transaction(() => {
      migration.up(database);
      database
        .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
        .run(migration.id, Date.now());
    })();
  }
}

function parseFileMeta(file) {
  if (file?.meta) {
    try {
      file.meta = JSON.parse(file.meta);
    } catch {
      file.meta = null;
    }
  }
  return file;
}

function parseMessageFileIds(message) {
  if (message?.file_ids) {
    try {
      message.file_ids = JSON.parse(message.file_ids);
    } catch {
      message.file_ids = null;
    }
  }
  if (message?.metadata) {
    try {
      message.metadata = JSON.parse(message.metadata);
    } catch {
      message.metadata = null;
    }
  }
  return message;
}

function buildUpdateFields(updates, fieldMap, transforms = {}) {
  const fields = [];
  const values = [];

  for (const [key, sqlColumn] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${sqlColumn} = ?`);
      values.push(transforms[key] ? transforms[key](updates[key]) : updates[key]);
    }
  }

  return { fields, values };
}

runMigrations(db);

export const dbUtils = {};
Object.assign(
  dbUtils,
  createUserUtils({ db, DB_CONSTANTS, randomBytes }),
  createProviderUtils({ db, buildUpdateFields }),
  createModelUtils({ db, buildUpdateFields }),
  createFileUtils({ db, parseFileMeta }),
  createChatUtils({ db, parseMessageFileIds }),
  createFolderUtils({ db, buildUpdateFields }),
  createSettingUtils({ db, encryptApiKey, decryptApiKey }),
  createAuditUtils({ db }),
  createMemoryUtils({ db })
);

dbUtils.cleanExpiredSessions();

export const sessionCleanupHandle = setInterval(() => {
  dbUtils.cleanExpiredSessions();
}, DB_CONSTANTS.SESSION_CLEANUP_INTERVAL_MS);
sessionCleanupHandle.unref?.();

export function stopDbTimers() {
  clearInterval(sessionCleanupHandle);
}

export default db;
