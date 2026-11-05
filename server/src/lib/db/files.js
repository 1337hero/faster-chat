function parseFileMeta(file) {
  if (file?.meta) {
    try {
      file.meta = JSON.parse(file.meta);
    } catch {
      file.meta = null;
    }
  }
  return file;
}

export function createFileUtils({ db }) {
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

    getFileByUserIdAndHash(userId, hash) {
      const stmt = db.prepare(
        "SELECT * FROM files WHERE user_id = ? AND hash = ? ORDER BY created_at ASC LIMIT 1"
      );
      return parseFileMeta(stmt.get(userId, hash));
    },

    getFilesByUserId(userId) {
      const stmt = db.prepare(
        "SELECT * FROM files WHERE user_id = ? AND json_extract(meta, '$.type') = 'generated' ORDER BY created_at DESC"
      );
      return stmt.all(userId).map(parseFileMeta);
    },

    getGeneratedFiles(userId) {
      const stmt = db.prepare(
        "SELECT * FROM files WHERE user_id = ? AND json_extract(meta, '$.type') = 'generated' ORDER BY created_at DESC"
      );
      return stmt.all(userId).map(parseFileMeta);
    },

    toggleFileFavorite(fileId) {
      db.prepare("UPDATE files SET is_favorite = 1 - is_favorite WHERE id = ?").run(fileId);
      const row = db.prepare("SELECT is_favorite FROM files WHERE id = ?").get(fileId);
      return !!row?.is_favorite;
    },

    getFilesByIdsForUser(fileIds, userId) {
      if (!fileIds || fileIds.length === 0) {
        return [];
      }
      const placeholders = fileIds.map(() => "?").join(",");
      const stmt = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND user_id = ?`);
      return stmt.all(...fileIds, userId).map(parseFileMeta);
    },

    getFileCountByPath(filePath) {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM files WHERE path = ?");
      return stmt.get(filePath).count;
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
