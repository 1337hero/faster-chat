function ignoreDuplicateColumn(fn) {
  try {
    fn();
  } catch (error) {
    if (!String(error.message).toLowerCase().includes("duplicate column")) {
      throw error;
    }
  }
}

export const migration = {
  id: 2,
  up(database) {
    ignoreDuplicateColumn(() => database.exec("ALTER TABLE chats ADD COLUMN pinned_at INTEGER"));
    ignoreDuplicateColumn(() => database.exec("ALTER TABLE chats ADD COLUMN archived_at INTEGER"));
    ignoreDuplicateColumn(() =>
      database.exec(
        "ALTER TABLE chats ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL"
      )
    );
    ignoreDuplicateColumn(() =>
      database.exec("ALTER TABLE models ADD COLUMN model_type TEXT DEFAULT 'text'")
    );
    ignoreDuplicateColumn(() => database.exec("ALTER TABLE messages ADD COLUMN metadata TEXT"));
    ignoreDuplicateColumn(() =>
      database.exec("ALTER TABLE users ADD COLUMN memory_enabled INTEGER DEFAULT 1")
    );
    ignoreDuplicateColumn(() =>
      database.exec("ALTER TABLE chats ADD COLUMN memory_disabled INTEGER DEFAULT 0")
    );
    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_chats_pinned ON chats(pinned_at);
        CREATE INDEX IF NOT EXISTS idx_chats_archived ON chats(archived_at);
        CREATE INDEX IF NOT EXISTS idx_chats_folder ON chats(folder_id);
        CREATE INDEX IF NOT EXISTS idx_models_type ON models(model_type);
      `);
  },
};
