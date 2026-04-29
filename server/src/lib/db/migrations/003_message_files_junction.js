export const migration = {
  id: 3,
  up(database) {
    // Create the junction table with foreign keys and ON DELETE CASCADE
    // Uses UUID primary key for consistency with the rest of the schema
    database.exec(`
      CREATE TABLE IF NOT EXISTS message_files (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(message_id, file_id),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for efficient querying
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_message_files_message_id ON message_files(message_id)
    `);
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_message_files_file_id ON message_files(file_id)
    `);

    // Backfill junction table from existing messages.file_ids JSON arrays
    // Skip orphaned IDs that don't exist in files table
    const messagesStmt = database.prepare(
      "SELECT id, file_ids FROM messages WHERE file_ids IS NOT NULL"
    );
    const messages = messagesStmt.all();

    if (messages.length === 0) {
      // No messages with file_ids to migrate
      database.exec(`ALTER TABLE messages DROP COLUMN file_ids`);
      return;
    }

    // Collect all file IDs referenced across all messages
    const allFileIds = new Set();
    for (const msg of messages) {
      try {
        const fileIds = JSON.parse(msg.file_ids);
        if (Array.isArray(fileIds)) {
          for (const fileId of fileIds) {
            allFileIds.add(fileId);
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // Batch fetch all existing file IDs in a single query
    const existingFileIds = new Set();
    if (allFileIds.size > 0) {
      const placeholders = [...allFileIds].map(() => "?").join(",");
      const fileRows = database
        .prepare(`SELECT id FROM files WHERE id IN (${placeholders})`)
        .all(...allFileIds);
      for (const row of fileRows) {
        existingFileIds.add(row.id);
      }
    }

    // Batch insert all valid junction rows
    const now = Date.now();
    const insertStmt = database.prepare(
      "INSERT INTO message_files (id, message_id, file_id, created_at) VALUES (?, ?, ?, ?)"
    );

    database.transaction(() => {
      for (const msg of messages) {
        let fileIds;
        try {
          fileIds = JSON.parse(msg.file_ids);
        } catch {
          // Skip malformed JSON
          continue;
        }

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
          continue;
        }

        for (const fileId of fileIds) {
          // Only insert if the file actually exists (skip orphans)
          if (existingFileIds.has(fileId)) {
            // Generate UUID for the junction row
            const junctionId = crypto.randomUUID();
            insertStmt.run(junctionId, msg.id, fileId, now);
          }
        }
      }
    })();

    // Drop the old file_ids column from messages table
    // SQLite 3.35+ supports DROP COLUMN
    database.exec(`ALTER TABLE messages DROP COLUMN file_ids`);
  },
};
