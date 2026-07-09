export const migration = {
  id: 5,
  up(database) {
    const columns = database.prepare("PRAGMA table_info(message_files)").all();
    if (columns.length === 0) {
      return;
    }

    database.exec(`
      CREATE TABLE message_files_new (
        message_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (message_id, file_id),
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      );

      INSERT INTO message_files_new (message_id, file_id, created_at)
      SELECT mf.message_id, mf.file_id, mf.created_at
      FROM message_files mf
      WHERE mf.rowid = (
        SELECT candidate.rowid
        FROM message_files candidate
        WHERE candidate.message_id = mf.message_id
          AND candidate.file_id = mf.file_id
        ORDER BY candidate.created_at ASC, candidate.rowid ASC
        LIMIT 1
      )
      ORDER BY mf.rowid ASC;

      DROP TABLE message_files;
      ALTER TABLE message_files_new RENAME TO message_files;
      CREATE INDEX IF NOT EXISTS idx_message_files_file_id ON message_files(file_id);
    `);
  },
};
