export const migration = {
  id: 1,
  up(database) {
    database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          memory_enabled INTEGER DEFAULT 1,
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

        CREATE TABLE IF NOT EXISTS models (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider_id INTEGER NOT NULL,
          model_id TEXT NOT NULL,
          display_name TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          model_type TEXT DEFAULT 'text',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
          UNIQUE(provider_id, model_id)
        );
        CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
        CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled);
        CREATE INDEX IF NOT EXISTS idx_models_type ON models(model_type);

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

        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title TEXT,
          folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          deleted_at INTEGER,
          pinned_at INTEGER,
          archived_at INTEGER,
          memory_disabled INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
        CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_chats_deleted ON chats(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_chats_pinned ON chats(pinned_at);
        CREATE INDEX IF NOT EXISTS idx_chats_archived ON chats(archived_at);
        CREATE INDEX IF NOT EXISTS idx_chats_folder ON chats(folder_id);

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chat_id TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          model TEXT,
          file_ids TEXT,
          metadata TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
        CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id TEXT,
          details TEXT,
          ip_address TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

        CREATE TABLE IF NOT EXISTS rate_limits (
          bucket_key TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON rate_limits(bucket_key, created_at);

        CREATE TABLE IF NOT EXISTS user_memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          fact TEXT NOT NULL,
          source_chat_id TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_memories_updated ON user_memories(user_id, updated_at DESC);
      `);
  },
};
