const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

/**
 * Transform snake_case keys to camelCase
 * Only handles the specific keys used in our API
 */
function toCamelCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const transformed = {};
  for (const [key, value] of Object.entries(obj)) {
    // Map snake_case to camelCase for known keys
    const camelKey =
      key === "created_at"
        ? "createdAt"
        : key === "updated_at"
          ? "updatedAt"
          : key === "pinned_at"
            ? "pinnedAt"
            : key === "archived_at"
              ? "archivedAt"
              : key === "file_ids"
                ? "fileIds"
                : key === "chat_id"
                  ? "chatId"
                  : key === "user_id"
                    ? "userId"
                    : key === "folder_id"
                      ? "folderId"
                      : key;
    transformed[camelKey] = toCamelCase(value);
  }
  return transformed;
}

async function chatsFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}/api/chats${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  // Normalize response keys to camelCase
  return toCamelCase(data);
}

export const chatsClient = {
  async getChats() {
    const data = await chatsFetch("");
    return data.chats;
  },

  async getChat(chatId) {
    return chatsFetch(`/${chatId}`);
  },

  async createChat(id = null, title = null, folderId = null) {
    return chatsFetch("", {
      method: "POST",
      body: JSON.stringify({ id, title, folder_id: folderId }),
    });
  },

  async updateChat(chatId, updates) {
    return chatsFetch(`/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteChat(chatId) {
    return chatsFetch(`/${chatId}`, {
      method: "DELETE",
    });
  },

  async getMessages(chatId) {
    const data = await chatsFetch(`/${chatId}/messages`);
    return data.messages;
  },

  async createMessage(chatId, message) {
    return chatsFetch(`/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(message),
    });
  },

  async deleteMessage(chatId, messageId) {
    return chatsFetch(`/${chatId}/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  async pinChat(chatId) {
    return chatsFetch(`/${chatId}/pin`, {
      method: "POST",
    });
  },

  async unpinChat(chatId) {
    return chatsFetch(`/${chatId}/pin`, {
      method: "DELETE",
    });
  },

  async archiveChat(chatId) {
    return chatsFetch(`/${chatId}/archive`, {
      method: "POST",
    });
  },

  async unarchiveChat(chatId) {
    return chatsFetch(`/${chatId}/archive`, {
      method: "DELETE",
    });
  },
};
