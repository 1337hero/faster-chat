export const migration = {
  id: 8,
  up(database) {
    database.exec(`ALTER TABLE files ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`);
  },
};
