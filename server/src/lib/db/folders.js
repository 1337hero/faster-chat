export function createFolderUtils({ db, buildUpdateFields }) {
  return {
    createFolder(id, userId, name, color = null, position = 0) {
      const now = Date.now();
      const stmt = db.prepare(`
      INSERT INTO folders (id, user_id, name, color, position, is_collapsed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);
      stmt.run(id, userId, name, color, position, now, now);
      return this.getFolderById(id);
    },

    getFolderById(folderId) {
      const stmt = db.prepare("SELECT * FROM folders WHERE id = ?");
      return stmt.get(folderId);
    },

    getFolderByIdAndUser(folderId, userId) {
      const stmt = db.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?");
      return stmt.get(folderId, userId);
    },

    getFoldersByUserId(userId) {
      const stmt = db.prepare(`
      SELECT * FROM folders
      WHERE user_id = ?
      ORDER BY position ASC, created_at ASC
    `);
      return stmt.all(userId);
    },

    updateFolder(folderId, userId, updates) {
      const folder = this.getFolderByIdAndUser(folderId, userId);
      if (!folder) {
        return null;
      }

      const fieldMap = {
        name: "name",
        color: "color",
        position: "position",
        is_collapsed: "is_collapsed",
      };
      const { fields, values } = buildUpdateFields(updates, fieldMap);

      if (fields.length === 0) {
        return folder;
      }

      fields.push("updated_at = ?");
      values.push(Date.now());
      values.push(folderId);

      const stmt = db.prepare(`UPDATE folders SET ${fields.join(", ")} WHERE id = ?`);
      stmt.run(...values);

      return this.getFolderByIdAndUser(folderId, userId);
    },

    deleteFolder(folderId, userId) {
      // First, unassign all chats from this folder
      const unassignStmt = db.prepare(
        "UPDATE chats SET folder_id = NULL WHERE folder_id = ? AND user_id = ?"
      );
      unassignStmt.run(folderId, userId);

      // Then delete the folder
      const stmt = db.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?");
      const result = stmt.run(folderId, userId);
      return result.changes > 0;
    },

    toggleFolderCollapse(folderId, userId) {
      const folder = this.getFolderByIdAndUser(folderId, userId);
      if (!folder) {
        return null;
      }

      const newState = folder.is_collapsed ? 0 : 1;
      const stmt = db.prepare(`
      UPDATE folders SET is_collapsed = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
      stmt.run(newState, Date.now(), folderId, userId);

      return this.getFolderByIdAndUser(folderId, userId);
    },

    moveChatToFolder(chatId, userId, folderId) {
      // Verify chat belongs to user
      const chat = this.getChatByIdAndUser(chatId, userId);
      if (!chat) {
        return null;
      }

      // If folderId is provided, verify folder belongs to user
      if (folderId) {
        const folder = this.getFolderByIdAndUser(folderId, userId);
        if (!folder) {
          return null;
        }
      }

      const stmt = db.prepare(`
      UPDATE chats SET folder_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
      stmt.run(folderId, Date.now(), chatId, userId);

      return this.getChatByIdAndUser(chatId, userId);
    },

    getChatsByFolder(folderId, userId) {
      const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE folder_id = ? AND user_id = ? AND deleted_at IS NULL AND archived_at IS NULL
      ORDER BY
        CASE WHEN pinned_at IS NOT NULL THEN 0 ELSE 1 END,
        pinned_at DESC,
        updated_at DESC
    `);
      return stmt.all(folderId, userId);
    },

    getFolderCount(userId) {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM folders WHERE user_id = ?");
      const result = stmt.get(userId);
      return result.count;
    },
  };
}
