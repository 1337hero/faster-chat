export function createFileUtils({ db, parseFileMeta }) {
  return {
    createFile(
      id,
      userId,
      filename,
      storedFilename,
      path,
      mimeType,
      size,
      hash = null,
      meta = null
    ) {
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
      if (!fileIds || fileIds.length === 0) {
        return [];
      }
      const placeholders = fileIds.map(() => "?").join(",");
      const stmt = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders})`);
      return stmt.all(...fileIds).map(parseFileMeta);
    },

    getFilesByIdsForUser(fileIds, userId) {
      if (!fileIds || fileIds.length === 0) {
        return [];
      }
      const placeholders = fileIds.map(() => "?").join(",");
      const stmt = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND user_id = ?`);
      return stmt.all(...fileIds, userId).map(parseFileMeta);
    },

    updateFileMetadata(fileId, meta) {
      const stmt = db.prepare("UPDATE files SET meta = ? WHERE id = ?");
      const metaJson = JSON.stringify(meta);
      stmt.run(metaJson, fileId);
    },

    deleteFile(fileId) {
      const stmt = db.prepare("DELETE FROM files WHERE id = ?");
      const result = stmt.run(fileId);
      return result.changes > 0;
    },

    deleteFileByUser(fileId, userId) {
      const stmt = db.prepare("DELETE FROM files WHERE id = ? AND user_id = ?");
      const result = stmt.run(fileId, userId);
      return result.changes > 0;
    },

    deleteFilesByUserId(userId) {
      const stmt = db.prepare("DELETE FROM files WHERE user_id = ?");
      const result = stmt.run(userId);
      return result.changes;
    },

    getFileCountByUserId(userId) {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM files WHERE user_id = ?");
      const result = stmt.get(userId);
      return result.count;
    },

    getStorageUsedByUserId(userId) {
      const stmt = db.prepare("SELECT SUM(size) as total FROM files WHERE user_id = ?");
      const result = stmt.get(userId);
      return result.total || 0;
    },
  };
}
