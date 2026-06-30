export function createChatUtils({ db, parseMessageMetadata, crypto }) {
  // Batch fetch file IDs for messages, ordered by created_at ASC
  function getMessageFileIds(messageIds) {
    if (!messageIds || messageIds.length === 0) {
      return {};
    }
    const placeholders = messageIds.map(() => "?").join(",");
    const stmt = db.prepare(
      `SELECT message_id, file_id FROM message_files WHERE message_id IN (${placeholders}) ORDER BY created_at ASC`
    );
    const rows = stmt.all(...messageIds);

    // Group file_ids by message_id
    const result = {};
    for (const row of rows) {
      if (!result[row.message_id]) {
        result[row.message_id] = [];
      }
      result[row.message_id].push(row.file_id);
    }
    return result;
  }

  // Attach file_ids to messages in memory
  function attachFileIds(messages) {
    if (!messages || messages.length === 0) {
      return messages;
    }
    const messageIds = messages.map((m) => m.id);
    const fileIdMap = getMessageFileIds(messageIds);
    for (const msg of messages) {
      // Use empty array when there are no associations
      msg.file_ids = fileIdMap[msg.id] ?? null;
    }
    return messages;
  }

  // Set/clear a timestamp flag column (pinned_at, archived_at) for an owned, non-deleted chat
  function setChatFlag(col, value, chatId, userId) {
    const stmt = db.prepare(
      `UPDATE chats SET ${col} = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    );
    return stmt.run(value, Date.now(), chatId, userId).changes > 0;
  }

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

    softDeleteChatByUser(chatId, userId) {
      const now = Date.now();
      const stmt = db.prepare(
        "UPDATE chats SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
      );
      const result = stmt.run(now, now, chatId, userId);
      return result.changes > 0;
    },

    pinChat(chatId, userId) {
      return setChatFlag("pinned_at", Date.now(), chatId, userId);
    },

    unpinChat(chatId, userId) {
      return setChatFlag("pinned_at", null, chatId, userId);
    },

    archiveChat(chatId, userId) {
      return setChatFlag("archived_at", Date.now(), chatId, userId);
    },

    unarchiveChat(chatId, userId) {
      return setChatFlag("archived_at", null, chatId, userId);
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
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      // Start transaction for atomicity
      db.transaction(() => {
        // Insert message row (no file_ids column)
        const stmt = db.prepare(`
        INSERT INTO messages (id, chat_id, user_id, role, content, model, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
        stmt.run(id, chatId, userId, role, content, model, metadataJson, now);

        // Insert junction rows for file associations - one per unique fileId
        if (fileIds && fileIds.length > 0) {
          const insertStmt = db.prepare(
            "INSERT INTO message_files (id, message_id, file_id, created_at) VALUES (?, ?, ?, ?)"
          );
          for (const fileId of new Set(fileIds)) {
            insertStmt.run(crypto.randomUUID(), id, fileId, now);
          }
        }
      })();

      return {
        id,
        chat_id: chatId,
        user_id: userId,
        role,
        content,
        model,
        // null when there are no associations, matching how reads return them
        file_ids: fileIds?.length ? fileIds : null,
        metadata,
        created_at: now,
      };
    },

    getMessageById(messageId) {
      const stmt = db.prepare("SELECT * FROM messages WHERE id = ?");
      const msg = stmt.get(messageId);
      if (!msg) return null;
      parseMessageMetadata(msg);
      attachFileIds([msg]);
      return msg;
    },

    getMessagesByChatAndUser(chatId, userId) {
      const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE chat_id = ? AND user_id = ?
      ORDER BY created_at ASC
    `);
      const messages = stmt.all(chatId, userId);
      for (const msg of messages) {
        parseMessageMetadata(msg);
      }
      return attachFileIds(messages);
    },

    deleteMessage(messageId) {
      const stmt = db.prepare("DELETE FROM messages WHERE id = ?");
      const result = stmt.run(messageId);
      return result.changes > 0;
    },

    deleteMessageByUser(messageId, userId, chatId) {
      const stmt = db.prepare("DELETE FROM messages WHERE id = ? AND user_id = ? AND chat_id = ?");
      const result = stmt.run(messageId, userId, chatId);
      return result.changes > 0;
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
      const messages = stmt.all(chatId, userId, limit, offset);
      for (const msg of messages) {
        parseMessageMetadata(msg);
      }
      return attachFileIds(messages);
    },

    purgeSoftDeletedChats(olderThanMs) {
      const cutoff = Date.now() - olderThanMs;
      const stmt = db.prepare("DELETE FROM chats WHERE deleted_at IS NOT NULL AND deleted_at < ?");
      const result = stmt.run(cutoff);
      return result.changes;
    },
  };
}
