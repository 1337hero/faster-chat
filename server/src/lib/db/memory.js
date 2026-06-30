export function createMemoryUtils({ db }) {
  return {
    getMemoriesForUser(userId, limit = 50) {
      const stmt = db.prepare(
        "SELECT id, fact, source_chat_id, created_at, updated_at FROM user_memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?"
      );
      return stmt.all(userId, limit);
    },

    upsertMemory(userId, fact, sourceChatId = null) {
      const existing = db
        .prepare("SELECT id FROM user_memories WHERE user_id = ? AND fact = ?")
        .get(userId, fact);
      const now = Date.now();
      if (existing) {
        db.prepare("UPDATE user_memories SET updated_at = ?, source_chat_id = ? WHERE id = ?").run(
          now,
          sourceChatId,
          existing.id
        );
        return existing.id;
      }
      const result = db
        .prepare(
          "INSERT INTO user_memories (user_id, fact, source_chat_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .run(userId, fact, sourceChatId, now, now);
      return result.lastInsertRowid;
    },

    upsertMemories(userId, facts, sourceChatId = null) {
      const upsert = db.transaction(() => {
        for (const fact of facts) {
          this.upsertMemory(userId, fact, sourceChatId);
        }
      });
      upsert();
    },

    deleteMemory(memoryId, userId) {
      const result = db
        .prepare("DELETE FROM user_memories WHERE id = ? AND user_id = ?")
        .run(memoryId, userId);
      return result.changes > 0;
    },

    clearMemoriesForUser(userId) {
      const result = db.prepare("DELETE FROM user_memories WHERE user_id = ?").run(userId);
      return result.changes;
    },

    getUserMemoryEnabled(userId) {
      const stmt = db.prepare("SELECT memory_enabled FROM users WHERE id = ?");
      const result = stmt.get(userId);
      return result ? !!result.memory_enabled : true;
    },

    setUserMemoryEnabled(userId, enabled) {
      db.prepare("UPDATE users SET memory_enabled = ? WHERE id = ?").run(enabled ? 1 : 0, userId);
    },

    getChatMemoryDisabled(chatId) {
      const stmt = db.prepare("SELECT memory_disabled FROM chats WHERE id = ?");
      const result = stmt.get(chatId);
      return result ? !!result.memory_disabled : false;
    },

    setChatMemoryDisabled(chatId, disabled) {
      db.prepare("UPDATE chats SET memory_disabled = ? WHERE id = ?").run(disabled ? 1 : 0, chatId);
    },

    getMemoryGlobalEnabled() {
      return this.getSetting("memory_enabled");
    },

    setMemoryGlobalEnabled(enabled) {
      this.setSetting("memory_enabled", enabled ? "true" : "false");
    },

    getMemoryExtractionModel() {
      return this.getSetting("memory_extraction_model");
    },

    setMemoryExtractionModel(modelId) {
      if (modelId) {
        this.setSetting("memory_extraction_model", modelId);
      } else {
        this.deleteSetting("memory_extraction_model");
      }
    },

    getMemoriesCount(userId) {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM user_memories WHERE user_id = ?");
      const result = stmt.get(userId);
      return result ? result.count : 0;
    },
  };
}
