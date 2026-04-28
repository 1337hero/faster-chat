export function createChatUtils({ db, parseMessageFileIds }) {
  return {
    createChat(id, userId, title = null, folderId = null, createdAt = Date.now()) {
      const now = createdAt;
      const stmt = db.prepare(`
      INSERT INTO chats (id, user_id, title, folder_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
      stmt.run(id, userId, title, folderId, now, now);
      return {
        id,
        user_id: userId,
        title,
        folder_id: folderId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
    },

    getChatById(chatId) {
      const stmt = db.prepare("SELECT * FROM chats WHERE id = ? AND deleted_at IS NULL");
      return stmt.get(chatId);
    },

    getChatByIdAndUser(chatId, userId) {
      const stmt = db.prepare(
        "SELECT * FROM chats WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
      );
      return stmt.get(chatId, userId);
    },

    getChatsByUserId(userId, includeArchived = false) {
      const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE user_id = ? AND deleted_at IS NULL AND folder_id IS NULL ${includeArchived ? "" : "AND archived_at IS NULL"}
      ORDER BY
        CASE WHEN pinned_at IS NOT NULL THEN 0 ELSE 1 END,
        pinned_at DESC,
        updated_at DESC
    `);
      return stmt.all(userId);
    },

    getArchivedChatsByUserId(userId) {
      const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE user_id = ? AND deleted_at IS NULL AND archived_at IS NOT NULL
      ORDER BY archived_at DESC
    `);
      return stmt.all(userId);
    },

    updateChatTitle(chatId, title) {
      const now = Date.now();
      const stmt = db.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?");
      stmt.run(title, now, chatId);
    },

    setChatTitleIfEmpty(chatId, title) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET title = ?, updated_at = ? WHERE id = ? AND title IS NULL"
      );
      const result = stmt.run(title, now, chatId);
      return result.changes > 0;
    },

    updateChatTimestamp(chatId) {
      const now = Date.now();
      const stmt = db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?");
      stmt.run(now, chatId);
    },

    updateChatTimestampTo(chatId, timestamp) {
      const stmt = db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?");
      stmt.run(timestamp, chatId);
    },

    softDeleteChat(chatId) {
      const now = Date.now();
      const stmt = db.prepare("UPDATE chats SET deleted_at = ?, updated_at = ? WHERE id = ?");
      const result = stmt.run(now, now, chatId);
      return result.changes > 0;
    },

    softDeleteChatByUser(chatId, userId) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
      );
      const result = stmt.run(now, now, chatId, userId);
      return result.changes > 0;
    },

    pinChat(chatId, userId) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET pinned_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
      );
      const result = stmt.run(now, now, chatId, userId);
      return result.changes > 0;
    },

    unpinChat(chatId, userId) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET pinned_at = NULL, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
      );
      const result = stmt.run(now, chatId, userId);
      return result.changes > 0;
    },

    archiveChat(chatId, userId) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
      );
      const result = stmt.run(now, now, chatId, userId);
      return result.changes > 0;
    },

    unarchiveChat(chatId, userId) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET archived_at = NULL, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
      );
      const result = stmt.run(now, chatId, userId);
      return result.changes > 0;
    },

    hardDeleteChat(chatId) {
      const stmt = db.prepare("DELETE FROM chats WHERE id = ?");
      const result = stmt.run(chatId);
      return result.changes > 0;
    },

    // ========================================
    // MESSAGE UTILITIES
    // ========================================,

    createMessage(
      id,
      chatId,
      userId,
      role,
      content,
      model = null,
      fileIds = null,
      metadata = null
    ) {
      const now = Date.now();
      const fileIdsJson = fileIds ? JSON.stringify(fileIds) : null;
      const metadataJson = metadata ? JSON.stringify(metadata) : null;
      const stmt = db.prepare(`
      INSERT INTO messages (id, chat_id, user_id, role, content, model, file_ids, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
      stmt.run(id, chatId, userId, role, content, model, fileIdsJson, metadataJson, now);
      return {
        id,
        chat_id: chatId,
        user_id: userId,
        role,
        content,
        model,
        file_ids: fileIds,
        metadata,
        created_at: now,
      };
    },

    getMessageById(messageId) {
      const stmt = db.prepare("SELECT * FROM messages WHERE id = ?");
      const msg = stmt.get(messageId);
      return parseMessageFileIds(msg);
    },

    getMessagesByChat(chatId) {
      const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE chat_id = ?
      ORDER BY created_at ASC
    `);
      return stmt.all(chatId).map(parseMessageFileIds);
    },

    getMessagesByChatAndUser(chatId, userId) {
      const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE chat_id = ? AND user_id = ?
      ORDER BY created_at ASC
    `);
      return stmt.all(chatId, userId).map(parseMessageFileIds);
    },

    deleteMessage(messageId) {
      const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
      const result = stmt.run(messageId);
      return result.changes > 0;
    },

    deleteMessageByUser(messageId, userId) {
      const stmt = db.prepare("DELETE FROM messages WHERE id = ? AND user_id = ?");
      const result = stmt.run(messageId, userId);
      return result.changes > 0;
    },

    deleteMessagesByChat(chatId) {
      const stmt = db.prepare("DELETE FROM messages WHERE chat_id = ?");
      const result = stmt.run(chatId);
      return result.changes;
    },

    getMessageCountByChat(chatId) {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM messages WHERE chat_id = ?");
      const result = stmt.get(chatId);
      return result.count;
    },

    getChatsByUserIdPaginated(userId, limit = 50, offset = 0, includeArchived = false) {
      const stmt = db.prepare(`
      SELECT * FROM chats
      WHERE user_id = ? AND deleted_at IS NULL AND folder_id IS NULL ${includeArchived ? "" : "AND archived_at IS NULL"}
      ORDER BY
        CASE WHEN pinned_at IS NOT NULL THEN 0 ELSE 1 END,
        pinned_at DESC,
        updated_at DESC
      LIMIT ? OFFSET ?
    `);
      return stmt.all(userId, limit, offset);
    },

    getMessagesByChatAndUserPaginated(chatId, userId, limit = 100, offset = 0) {
      const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE chat_id = ? AND user_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `);
      return stmt.all(chatId, userId, limit, offset).map(parseMessageFileIds);
    },

    purgeSoftDeletedChats(olderThanMs) {
      const cutoff = Date.now() - olderThanMs;
      const stmt = db.prepare("DELETE FROM chats WHERE deleted_at IS NOT NULL AND deleted_at < ?");
      const result = stmt.run(cutoff);
      return result.changes;
    },
  };
}
