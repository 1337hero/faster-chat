export const migration = {
  id: 6,
  up(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        revoked_at INTEGER
      );
    `);
  },
};
