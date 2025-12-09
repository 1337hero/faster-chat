import { Database } from "bun:sqlite";
import { randomBytes } from "crypto";
import { config } from "dotenv";
import { DB_CONSTANTS } from "@faster-chat/shared";

config();

// Initialize database
const dbPath = process.env.DATABASE_URL?.replace("sqlite://", "") || "./data/chat.db";
const db = new Database(dbPath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON");

if (process.env.NODE_ENV === "production") {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec(`PRAGMA cache_size = ${DB_CONSTANTS.CACHE_SIZE_PAGES}`);
  db.exec("PRAGMA temp_store = MEMORY");
  db.exec(`PRAGMA mmap_size = ${DB_CONSTANTS.MMAP_SIZE_BYTES}`);
}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at INTEGER NOT NULL,
    created_by INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

  -- API Providers (OpenAI, Anthropic, Ollama, etc.)
  CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    base_url TEXT,
    encrypted_key TEXT,
    iv TEXT,
    auth_tag TEXT,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- Models (GPT-4, Claude, etc.)
  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE(provider_id, model_id)
  );

  -- Model metadata (pricing, limits, capabilities)
  CREATE TABLE IF NOT EXISTS model_metadata (
    model_id INTEGER PRIMARY KEY,
    context_window INTEGER,
    max_output_tokens INTEGER,
    input_price_per_1m REAL,
    output_price_per_1m REAL,
    supports_streaming INTEGER DEFAULT 1,
    supports_vision INTEGER DEFAULT 0,
    supports_tools INTEGER DEFAULT 0,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
  CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled);

  -- Files table for attachments
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    path TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    hash TEXT,
    meta TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
  CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
  CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);

  -- Folders for organizing chats
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_collapsed INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
  CREATE INDEX IF NOT EXISTS idx_folders_position ON folders(user_id, position);

  -- Chats table for conversation persistence
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
  CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_chats_deleted ON chats(deleted_at);

  -- Add pinned_at and archived_at columns if they don't exist
  -- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we handle this in code

  -- Messages table for chat messages
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    file_ids TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
  CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

  -- App settings (key-value store for customization)
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// Migration: Add pinned_at and archived_at columns to chats table
// SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so check manually
const chatColumns = db.prepare("PRAGMA table_info(chats)").all();
const columnNames = chatColumns.map((col) => col.name);

if (!columnNames.includes("pinned_at")) {
  db.exec("ALTER TABLE chats ADD COLUMN pinned_at INTEGER");
}
if (!columnNames.includes("archived_at")) {
  db.exec("ALTER TABLE chats ADD COLUMN archived_at INTEGER");
}
if (!columnNames.includes("folder_id")) {
  db.exec("ALTER TABLE chats ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL");
}

// Create indexes for pinned/archived/folder queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_chats_pinned ON chats(pinned_at);
  CREATE INDEX IF NOT EXISTS idx_chats_archived ON chats(archived_at);
  CREATE INDEX IF NOT EXISTS idx_chats_folder ON chats(folder_id);
`);

const modelColumns = db.prepare("PRAGMA table_info(models)").all();
const modelColumnNames = modelColumns.map((col) => col.name);

if (!modelColumnNames.includes("model_type")) {
  db.exec("ALTER TABLE models ADD COLUMN model_type TEXT DEFAULT 'text'");
}

db.exec("CREATE INDEX IF NOT EXISTS idx_models_type ON models(model_type)");

function parseFileMeta(file) {
  if (file && file.meta) {
    try {
      file.meta = JSON.parse(file.meta);
    } catch (e) {
      file.meta = null;
    }
  }
  return file;
}

function parseMessageFileIds(message) {
  if (message && message.file_ids) {
    try {
      message.file_ids = JSON.parse(message.file_ids);
    } catch (e) {
      message.file_ids = null;
    }
  }
  return message;
}

function buildUpdateFields(updates, fieldMap) {
  const fields = [];
  const values = [];

  for (const [key, sqlColumn] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${sqlColumn} = ?`);
      values.push(updates[key]);
    }
  }

  return { fields, values };
}

export const dbUtils = {
  getUserByUsername(username) {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username);
  },

  /**
   * Get user by ID
   * @param {number} userId
   */
  getUserById(userId) {
    const stmt = db.prepare("SELECT id, username, role, created_at FROM users WHERE id = ?");
    return stmt.get(userId);
  },

  /**
   * Create a new user
   * @param {string} username
   * @param {string} passwordHash
   * @param {string} role
   * @param {number|null} createdBy
   */
  createUser(username, passwordHash, role = "member", createdBy = null) {
    const stmt = db.prepare(
      "INSERT INTO users (username, password_hash, role, created_at, created_by) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(username, passwordHash, role, Date.now(), createdBy);
    return result.lastInsertRowid;
  },

  /**
   * Get total user count
   */
  getUserCount() {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
    const result = stmt.get();
    return result.count;
  },

  createSession(userId, expiresInMs = DB_CONSTANTS.DEFAULT_SESSION_EXPIRY_MS) {
    const sessionId = randomBytes(DB_CONSTANTS.SESSION_ID_BYTES).toString("hex");
    const expiresAt = Date.now() + expiresInMs;

    const stmt = db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    );
    stmt.run(sessionId, userId, expiresAt, Date.now());

    return { sessionId, expiresAt };
  },

  /**
   * Get session with user info
   * @param {string} sessionId
   */
  getSession(sessionId) {
    const stmt = db.prepare(`
      SELECT
        s.id as session_id,
        s.user_id,
        s.expires_at,
        u.username,
        u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `);
    return stmt.get(sessionId, Date.now());
  },

  /**
   * Delete a session
   * @param {string} sessionId
   */
  deleteSession(sessionId) {
    const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
    stmt.run(sessionId);
  },

  /**
   * Delete all sessions for a user
   * @param {number} userId
   */
  deleteUserSessions(userId) {
    const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
    stmt.run(userId);
  },

  /**
   * Clean up expired sessions
   */
  cleanExpiredSessions() {
    const stmt = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
    const result = stmt.run(Date.now());
    return result.changes;
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers() {
    const stmt = db.prepare(
      "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
    );
    return stmt.all();
  },

  /**
   * Update user role
   * @param {number} userId
   * @param {string} role
   */
  updateUserRole(userId, role) {
    const stmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");
    stmt.run(role, userId);
  },

  /**
   * Update user password
   * @param {number} userId
   * @param {string} passwordHash
   */
  updateUserPassword(userId, passwordHash) {
    const stmt = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    stmt.run(passwordHash, userId);
  },

  /**
   * Delete user
   * @param {number} userId
   */
  deleteUser(userId) {
    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    stmt.run(userId);
  },

  // ========================================
  // PROVIDER UTILITIES
  // ========================================

  /**
   * Create a new provider
   */
  createProvider(name, displayName, providerType, baseUrl, encryptedKey, iv, authTag) {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO providers (name, display_name, provider_type, base_url, encrypted_key, iv, auth_tag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name,
      displayName,
      providerType,
      baseUrl,
      encryptedKey,
      iv,
      authTag,
      now,
      now
    );
    return result.lastInsertRowid;
  },

  /**
   * Get provider by ID
   */
  getProviderById(providerId) {
    const stmt = db.prepare("SELECT * FROM providers WHERE id = ?");
    return stmt.get(providerId);
  },

  /**
   * Get provider by name
   */
  getProviderByName(name) {
    const stmt = db.prepare("SELECT * FROM providers WHERE name = ?");
    return stmt.get(name);
  },

  /**
   * Get all providers
   */
  getAllProviders() {
    const stmt = db.prepare("SELECT * FROM providers ORDER BY created_at ASC");
    return stmt.all();
  },

  /**
   * Get enabled providers
   */
  getEnabledProviders() {
    const stmt = db.prepare("SELECT * FROM providers WHERE enabled = 1 ORDER BY created_at ASC");
    return stmt.all();
  },

  updateProvider(providerId, updates) {
    const fieldMap = {
      displayName: "display_name",
      baseUrl: "base_url",
      encryptedKey: "encrypted_key",
      iv: "iv",
      authTag: "auth_tag",
      enabled: "enabled",
    };

    const { fields, values } = buildUpdateFields(updates, fieldMap);

    if (updates.enabled !== undefined) {
      const enabledIndex = fields.findIndex((f) => f.includes("enabled"));
      if (enabledIndex >= 0) {
        values[enabledIndex] = updates.enabled ? 1 : 0;
      }
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(providerId);

    const stmt = db.prepare(`UPDATE providers SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);
  },

  /**
   * Delete provider (cascades to models)
   */
  deleteProvider(providerId) {
    const stmt = db.prepare("DELETE FROM providers WHERE id = ?");
    stmt.run(providerId);
  },

  // ========================================
  // MODEL UTILITIES
  // ========================================

  /**
   * Create a new model
   */
  createModel(providerId, modelId, displayName, enabled = true, modelType = "text") {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO models (provider_id, model_id, display_name, enabled, model_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(providerId, modelId, displayName, enabled ? 1 : 0, modelType, now, now);
    return result.lastInsertRowid;
  },

  /**
   * Get model by ID
   */
  getModelById(modelId) {
    const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.id = ?
    `);
    return stmt.get(modelId);
  },

  /**
   * Get all models
   */
  getAllModels() {
    const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      ORDER BY p.name ASC, m.display_name ASC
    `);
    return stmt.all();
  },

  getModelsByType(modelType) {
    if (!modelType) {
      return this.getAllModels();
    }

    const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.model_type = ?
      ORDER BY p.name ASC, m.display_name ASC
    `);
    return stmt.all(modelType);
  },

  /**
   * Get enabled models
   */
  getEnabledModels() {
    const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.enabled = 1 AND p.enabled = 1
      ORDER BY p.name ASC, m.display_name ASC
    `);
    return stmt.all();
  },

  getEnabledModelsByType(modelType) {
    if (!modelType) {
      return this.getEnabledModels();
    }

    const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.enabled = 1 AND p.enabled = 1 AND m.model_type = ?
      ORDER BY p.name ASC, m.display_name ASC
    `);
    return stmt.all(modelType);
  },

  /**
   * Get a single enabled model (lookup by model_id string)
   */
  getEnabledModelWithProvider(modelIdentifier) {
    const stmt = db.prepare(`
      SELECT
        m.*,
        p.name as provider_name,
        p.display_name as provider_display_name,
        p.base_url as provider_base_url,
        p.encrypted_key as provider_encrypted_key,
        p.iv as provider_iv,
        p.auth_tag as provider_auth_tag
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.model_id = ? AND m.enabled = 1 AND p.enabled = 1
      LIMIT 1
    `);
    return stmt.get(modelIdentifier);
  },

  /**
   * Get models by provider
   */
  getModelsByProvider(providerId) {
    const stmt = db.prepare("SELECT * FROM models WHERE provider_id = ? ORDER BY display_name ASC");
    return stmt.all(providerId);
  },

  updateModel(modelId, updates) {
    const fieldMap = {
      displayName: "display_name",
      enabled: "enabled",
      isDefault: "is_default",
    };

    if (updates.isDefault) {
      db.prepare("UPDATE models SET is_default = 0").run();
    }

    const { fields, values } = buildUpdateFields(updates, fieldMap);

    if (updates.enabled !== undefined) {
      const enabledIndex = fields.findIndex((f) => f.includes("enabled"));
      if (enabledIndex >= 0) {
        values[enabledIndex] = updates.enabled ? 1 : 0;
      }
    }

    if (updates.isDefault !== undefined) {
      const defaultIndex = fields.findIndex((f) => f.includes("is_default"));
      if (defaultIndex >= 0) {
        values[defaultIndex] = updates.isDefault ? 1 : 0;
      }
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(modelId);

    const stmt = db.prepare(`UPDATE models SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);
  },

  /**
   * Delete model
   */
  deleteModel(modelId) {
    const stmt = db.prepare("DELETE FROM models WHERE id = ?");
    stmt.run(modelId);
  },

  /**
   * Delete all models for a provider
   */
  deleteModelsForProvider(providerId) {
    const stmt = db.prepare("DELETE FROM models WHERE provider_id = ?");
    stmt.run(providerId);
  },

  /**
   * Set enabled flag for all models under a provider
   */
  setModelsEnabledForProvider(providerId, enabled) {
    const stmt = db.prepare("UPDATE models SET enabled = ?, updated_at = ? WHERE provider_id = ?");
    stmt.run(enabled ? 1 : 0, Date.now(), providerId);
  },

  /**
   * Get default model
   */
  getDefaultModel() {
    const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.is_default = 1 AND m.enabled = 1 AND p.enabled = 1
      LIMIT 1
    `);
    return stmt.get();
  },

  // ========================================
  // MODEL METADATA UTILITIES
  // ========================================

  /**
   * Set model metadata
   */
  setModelMetadata(modelId, metadata) {
    const stmt = db.prepare(`
      INSERT INTO model_metadata (
        model_id, context_window, max_output_tokens,
        input_price_per_1m, output_price_per_1m,
        supports_streaming, supports_vision, supports_tools
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(model_id) DO UPDATE SET
        context_window = excluded.context_window,
        max_output_tokens = excluded.max_output_tokens,
        input_price_per_1m = excluded.input_price_per_1m,
        output_price_per_1m = excluded.output_price_per_1m,
        supports_streaming = excluded.supports_streaming,
        supports_vision = excluded.supports_vision,
        supports_tools = excluded.supports_tools
    `);

    stmt.run(
      modelId,
      metadata.context_window ?? metadata.contextWindow ?? null,
      metadata.max_output_tokens ?? metadata.maxOutputTokens ?? null,
      metadata.input_price_per_1m ?? metadata.inputPrice ?? null,
      metadata.output_price_per_1m ?? metadata.outputPrice ?? null,
      (metadata.supports_streaming ?? metadata.supportsStreaming) ? 1 : 0,
      (metadata.supports_vision ?? metadata.supportsVision) ? 1 : 0,
      (metadata.supports_tools ?? metadata.supportsTools) ? 1 : 0
    );
  },

  /**
   * Get model metadata
   */
  getModelMetadata(modelId) {
    const stmt = db.prepare("SELECT * FROM model_metadata WHERE model_id = ?");
    return stmt.get(modelId);
  },

  /**
   * Get model with metadata
   */
  getModelWithMetadata(modelId) {
    const stmt = db.prepare(`
      SELECT
        m.*,
        p.name as provider_name,
        p.display_name as provider_display_name,
        md.context_window,
        md.max_output_tokens,
        md.input_price_per_1m,
        md.output_price_per_1m,
        md.supports_streaming,
        md.supports_vision,
        md.supports_tools
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      LEFT JOIN model_metadata md ON m.id = md.model_id
      WHERE m.id = ?
    `);
    return stmt.get(modelId);
  },

  // ========================================
  // FILE UTILITIES
  // ========================================

  /**
   * Create a new file record
   * @param {string} id - UUID for the file
   * @param {number} userId - User ID who uploaded the file
   * @param {string} filename - Original filename
   * @param {string} storedFilename - Filename stored on disk ({uuid}_{filename})
   * @param {string} path - Relative path to file
   * @param {string} mimeType - MIME type of the file
   * @param {number} size - File size in bytes
   * @param {string|null} hash - SHA-256 hash (optional)
   * @param {object|null} meta - Additional metadata (optional)
   */
  createFile(id, userId, filename, storedFilename, path, mimeType, size, hash = null, meta = null) {
    const stmt = db.prepare(`
      INSERT INTO files (id, user_id, filename, stored_filename, path, mime_type, size, hash, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const metaJson = meta ? JSON.stringify(meta) : null;
    const result = stmt.run(
      id,
      userId,
      filename,
      storedFilename,
      path,
      mimeType,
      size,
      hash,
      metaJson,
      Date.now()
    );
    return result.changes > 0 ? id : null;
  },

  getFileById(fileId) {
    const stmt = db.prepare("SELECT * FROM files WHERE id = ?");
    return parseFileMeta(stmt.get(fileId));
  },

  getFileByIdAndUser(fileId, userId) {
    const stmt = db.prepare("SELECT * FROM files WHERE id = ? AND user_id = ?");
    return parseFileMeta(stmt.get(fileId, userId));
  },

  getFilesByUserId(userId) {
    const stmt = db.prepare("SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC");
    return stmt.all(userId).map(parseFileMeta);
  },

  getFilesByIds(fileIds) {
    if (!fileIds || fileIds.length === 0) return [];
    const placeholders = fileIds.map(() => "?").join(",");
    const stmt = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders})`);
    return stmt.all(...fileIds).map(parseFileMeta);
  },

  getFilesByIdsForUser(fileIds, userId) {
    if (!fileIds || fileIds.length === 0) return [];
    const placeholders = fileIds.map(() => "?").join(",");
    const stmt = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND user_id = ?`);
    return stmt.all(...fileIds, userId).map(parseFileMeta);
  },

  /**
   * Update file metadata
   * @param {string} fileId
   * @param {object} meta
   */
  updateFileMetadata(fileId, meta) {
    const stmt = db.prepare("UPDATE files SET meta = ? WHERE id = ?");
    const metaJson = JSON.stringify(meta);
    stmt.run(metaJson, fileId);
  },

  /**
   * Delete file by ID
   * @param {string} fileId
   */
  deleteFile(fileId) {
    const stmt = db.prepare("DELETE FROM files WHERE id = ?");
    const result = stmt.run(fileId);
    return result.changes > 0;
  },

  /**
   * Delete file by ID with user check
   * @param {string} fileId
   * @param {number} userId
   */
  deleteFileByUser(fileId, userId) {
    const stmt = db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?");
    const result = stmt.run(fileId, userId);
    return result.changes > 0;
  },

  /**
   * Delete all files for a user
   * @param {number} userId
   */
  deleteFilesByUserId(userId) {
    const stmt = db.prepare("DELETE FROM files WHERE user_id = ?");
    const result = stmt.run(userId);
    return result.changes;
  },

  /**
   * Get file count for a user
   * @param {number} userId
   */
  getFileCountByUserId(userId) {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM files WHERE user_id = ?");
    const result = stmt.get(userId);
    return result.count;
  },

  /**
   * Get total storage used by a user (in bytes)
   * @param {number} userId
   */
  getStorageUsedByUserId(userId) {
    const stmt = db.prepare("SELECT SUM(size) as total FROM files WHERE user_id = ?");
    const result = stmt.get(userId);
    return result.total || 0;
  },

  // ========================================
  // CHAT UTILITIES
  // ========================================

  createChat(id, userId, title = null, folderId = null) {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO chats (id, user_id, title, folder_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, title, folderId, now, now);
    return {
      id,
      user_id: userId,
      title,
      folder_id: folderId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  },

  getChatById(chatId) {
    const stmt = db.prepare("SELECT * FROM chats WHERE id = ? AND deleted_at IS NULL");
    return stmt.get(chatId);
  },

  getChatByIdAndUser(chatId, userId) {
    const stmt = db.prepare(
      "SELECT * FROM chats WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    return stmt.get(chatId, userId);
  },

  getChatsByUserId(userId, includeArchived = false) {
    const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE user_id = ? AND deleted_at IS NULL ${includeArchived ? "" : "AND archived_at IS NULL"}
      ORDER BY
        CASE WHEN pinned_at IS NOT NULL THEN 0 ELSE 1 END,
        pinned_at DESC,
        updated_at DESC
    `);
    return stmt.all(userId);
  },

  getArchivedChatsByUserId(userId) {
    const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE user_id = ? AND deleted_at IS NULL AND archived_at IS NOT NULL
      ORDER BY archived_at DESC
    `);
    return stmt.all(userId);
  },

  updateChatTitle(chatId, title) {
    const now = Date.now();
    const stmt = db.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?");
    stmt.run(title, now, chatId);
  },

  updateChatTimestamp(chatId) {
    const now = Date.now();
    const stmt = db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?");
    stmt.run(now, chatId);
  },

  updateChatTimestampTo(chatId, timestamp) {
    const stmt = db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?");
    stmt.run(timestamp, chatId);
  },

  softDeleteChat(chatId) {
    const now = Date.now();
    const stmt = db.prepare("UPDATE chats SET deleted_at = ?, updated_at = ? WHERE id = ?");
    const result = stmt.run(now, now, chatId);
    return result.changes > 0;
  },

  softDeleteChatByUser(chatId, userId) {
    const now = Date.now();
    const stmt = db.prepare(
      "UPDATE chats SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(now, now, chatId, userId);
    return result.changes > 0;
  },

  pinChat(chatId, userId) {
    const now = Date.now();
    const stmt = db.prepare(
      "UPDATE chats SET pinned_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    const result = stmt.run(now, now, chatId, userId);
    return result.changes > 0;
  },

  unpinChat(chatId, userId) {
    const now = Date.now();
    const stmt = db.prepare(
      "UPDATE chats SET pinned_at = NULL, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    const result = stmt.run(now, chatId, userId);
    return result.changes > 0;
  },

  archiveChat(chatId, userId) {
    const now = Date.now();
    const stmt = db.prepare(
      "UPDATE chats SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    const result = stmt.run(now, now, chatId, userId);
    return result.changes > 0;
  },

  unarchiveChat(chatId, userId) {
    const now = Date.now();
    const stmt = db.prepare(
      "UPDATE chats SET archived_at = NULL, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    const result = stmt.run(now, chatId, userId);
    return result.changes > 0;
  },

  hardDeleteChat(chatId) {
    const stmt = db.prepare("DELETE FROM chats WHERE id = ?");
    const result = stmt.run(chatId);
    return result.changes > 0;
  },

  // ========================================
  // MESSAGE UTILITIES
  // ========================================

  createMessage(id, chatId, userId, role, content, model = null, fileIds = null) {
    const now = Date.now();
    const fileIdsJson = fileIds ? JSON.stringify(fileIds) : null;
    const stmt = db.prepare(`
      INSERT INTO messages (id, chat_id, user_id, role, content, model, file_ids, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, chatId, userId, role, content, model, fileIdsJson, now);
    return {
      id,
      chat_id: chatId,
      user_id: userId,
      role,
      content,
      model,
      file_ids: fileIds,
      created_at: now,
    };
  },

  getMessageById(messageId) {
    const stmt = db.prepare("SELECT * FROM messages WHERE id = ?");
    const msg = stmt.get(messageId);
    return parseMessageFileIds(msg);
  },

  getMessagesByChat(chatId) {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE chat_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(chatId).map(parseMessageFileIds);
  },

  getMessagesByChatAndUser(chatId, userId) {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE chat_id = ? AND user_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(chatId, userId).map(parseMessageFileIds);
  },

  deleteMessage(messageId) {
    const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
    const result = stmt.run(messageId);
    return result.changes > 0;
  },

  deleteMessageByUser(messageId, userId) {
    const stmt = db.prepare("DELETE FROM messages WHERE id = ? AND user_id = ?");
    const result = stmt.run(messageId, userId);
    return result.changes > 0;
  },

  deleteMessagesByChat(chatId) {
    const stmt = db.prepare("DELETE FROM messages WHERE chat_id = ?");
    const result = stmt.run(chatId);
    return result.changes;
  },

  getMessageCountByChat(chatId) {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM messages WHERE chat_id = ?");
    const result = stmt.get(chatId);
    return result.count;
  },

  // ========================================
  // FOLDER UTILITIES
  // ========================================

  /**
   * Create a new folder
   */
  createFolder(id, userId, name, color = null, position = 0) {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO folders (id, user_id, name, color, position, is_collapsed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);
    stmt.run(id, userId, name, color, position, now, now);
    return this.getFolderById(id);
  },

  /**
   * Get folder by ID
   */
  getFolderById(folderId) {
    const stmt = db.prepare("SELECT * FROM folders WHERE id = ?");
    return stmt.get(folderId);
  },

  /**
   * Get folder by ID and user (for security)
   */
  getFolderByIdAndUser(folderId, userId) {
    const stmt = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?");
    return stmt.get(folderId, userId);
  },

  /**
   * Get all folders for a user
   */
  getFoldersByUserId(userId) {
    const stmt = db.prepare(`
      SELECT * FROM folders
      WHERE user_id = ?
      ORDER BY position ASC, created_at ASC
    `);
    return stmt.all(userId);
  },

  /**
   * Update a folder
   */
  updateFolder(folderId, userId, updates) {
    const folder = this.getFolderByIdAndUser(folderId, userId);
    if (!folder) return null;

    const fieldMap = {
      name: "name",
      color: "color",
      position: "position",
      is_collapsed: "is_collapsed",
    };
    const { fields, values } = buildUpdateFields(updates, fieldMap);

    if (fields.length === 0) return folder;

    fields.push("updated_at = ?");
    values.push(Date.now());
    values.push(folderId);

    const stmt = db.prepare(`UPDATE folders SET ${fields.join(", ")} WHERE id = ?`);
    stmt.run(...values);

    return this.getFolderByIdAndUser(folderId, userId);
  },

  /**
   * Delete a folder (chats in folder get unassigned)
   */
  deleteFolder(folderId, userId) {
    // First, unassign all chats from this folder
    const unassignStmt = db.prepare(
      "UPDATE chats SET folder_id = NULL WHERE folder_id = ? AND user_id = ?"
    );
    unassignStmt.run(folderId, userId);

    // Then delete the folder
    const stmt = db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?");
    const result = stmt.run(folderId, userId);
    return result.changes > 0;
  },

  /**
   * Toggle folder collapsed state
   */
  toggleFolderCollapse(folderId, userId) {
    const folder = this.getFolderByIdAndUser(folderId, userId);
    if (!folder) return null;

    const newState = folder.is_collapsed ? 0 : 1;
    const stmt = db.prepare(`
      UPDATE folders SET is_collapsed = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(newState, Date.now(), folderId, userId);

    return this.getFolderByIdAndUser(folderId, userId);
  },

  /**
   * Move chat to folder
   */
  moveChatToFolder(chatId, userId, folderId) {
    // Verify chat belongs to user
    const chat = this.getChatByIdAndUser(chatId, userId);
    if (!chat) return null;

    // If folderId is provided, verify folder belongs to user
    if (folderId) {
      const folder = this.getFolderByIdAndUser(folderId, userId);
      if (!folder) return null;
    }

    const stmt = db.prepare(`
      UPDATE chats SET folder_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(folderId, Date.now(), chatId, userId);

    return this.getChatByIdAndUser(chatId, userId);
  },

  /**
   * Get chats in a folder
   */
  getChatsByFolder(folderId, userId) {
    const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE folder_id = ? AND user_id = ? AND deleted_at IS NULL AND archived_at IS NULL
      ORDER BY
        CASE WHEN pinned_at IS NOT NULL THEN 0 ELSE 1 END,
        pinned_at DESC,
        updated_at DESC
    `);
    return stmt.all(folderId, userId);
  },

  /**
   * Get folder count for a user
   */
  getFolderCount(userId) {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM folders WHERE user_id = ?");
    const result = stmt.get(userId);
    return result.count;
  },

  // ========================================
  // SETTINGS UTILITIES
  // ========================================

  getSetting(key) {
    const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
    const result = stmt.get(key);
    return result ? result.value : null;
  },

  getAllSettings() {
    const stmt = db.prepare("SELECT key, value FROM settings");
    const rows = stmt.all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  setSetting(key, value) {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(key, value, now);
  },

  setSettings(settings) {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value, now);
    }
  },

  deleteSetting(key) {
    const stmt = db.prepare("DELETE FROM settings WHERE key = ?");
    const result = stmt.run(key);
    return result.changes > 0;
  },
};

// Clean up expired sessions on startup
dbUtils.cleanExpiredSessions();

setInterval(() => {
  dbUtils.cleanExpiredSessions();
}, DB_CONSTANTS.SESSION_CLEANUP_INTERVAL_MS);

export default db;
