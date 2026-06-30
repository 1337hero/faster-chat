export const migration = {
  id: 4,
  up(database) {
    // Repair junction rows written by the buggy insert that omitted the id
    // (TEXT PRIMARY KEY accepts NULL, so these slipped in unkeyed).
    const rows = database.prepare("SELECT rowid FROM message_files WHERE id IS NULL").all();
    if (rows.length === 0) {
      return;
    }
    const update = database.prepare("UPDATE message_files SET id = ? WHERE rowid = ?");
    database.transaction(() => {
      for (const row of rows) {
        update.run(crypto.randomUUID(), row.rowid);
      }
    })();
  },
};
