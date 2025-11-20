import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { config } from "dotenv";

config();

// Initialize database
const dbPath = process.env.DATABASE_URL?.replace("sqlite://", "") || "./data/chat.db";
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

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
`);

/**
 * Database utilities
 */

export const dbUtils = {
  /**
   * Get user by username
   * @param {string} username
   */
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

  /**
   * Create a new session
   * @param {number} userId
   * @param {number} expiresInMs
   */
  createSession(userId, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
    const sessionId = randomBytes(32).toString("hex");
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
    const result = stmt.run(name, displayName, providerType, baseUrl, encryptedKey, iv, authTag, now, now);
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

  /**
   * Update provider
   */
  updateProvider(providerId, updates) {
    const fields = [];
    const values = [];

    if (updates.displayName !== undefined) {
      fields.push("display_name = ?");
      values.push(updates.displayName);
    }
    if (updates.baseUrl !== undefined) {
      fields.push("base_url = ?");
      values.push(updates.baseUrl);
    }
    if (updates.encryptedKey !== undefined) {
      fields.push("encrypted_key = ?");
      values.push(updates.encryptedKey);
    }
    if (updates.iv !== undefined) {
      fields.push("iv = ?");
      values.push(updates.iv);
    }
    if (updates.authTag !== undefined) {
      fields.push("auth_tag = ?");
      values.push(updates.authTag);
    }
    if (updates.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
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
  createModel(providerId, modelId, displayName, enabled = true) {
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO models (provider_id, model_id, display_name, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(providerId, modelId, displayName, enabled ? 1 : 0, now, now);
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

  /**
   * Get models by provider
   */
  getModelsByProvider(providerId) {
    const stmt = db.prepare("SELECT * FROM models WHERE provider_id = ? ORDER BY display_name ASC");
    return stmt.all(providerId);
  },

  /**
   * Update model
   */
  updateModel(modelId, updates) {
    const fields = [];
    const values = [];

    if (updates.displayName !== undefined) {
      fields.push("display_name = ?");
      values.push(updates.displayName);
    }
    if (updates.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.isDefault !== undefined) {
      // If setting as default, unset all others first
      if (updates.isDefault) {
        db.prepare("UPDATE models SET is_default = 0").run();
      }
      fields.push("is_default = ?");
      values.push(updates.isDefault ? 1 : 0);
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
      metadata.contextWindow || null,
      metadata.maxOutputTokens || null,
      metadata.inputPrice || null,
      metadata.outputPrice || null,
      metadata.supportsStreaming ? 1 : 0,
      metadata.supportsVision ? 1 : 0,
      metadata.supportsTools ? 1 : 0
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
};

// Clean up expired sessions on startup
dbUtils.cleanExpiredSessions();

// Schedule cleanup every hour
setInterval(
  () => {
    dbUtils.cleanExpiredSessions();
  },
  60 * 60 * 1000
);

export default db;
