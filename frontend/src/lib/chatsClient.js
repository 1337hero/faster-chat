import { apiFetch } from "@/lib/api";

const SNAKE_TO_CAMEL = {
  created_at: "createdAt",
  updated_at: "updatedAt",
  pinned_at: "pinnedAt",
  archived_at: "archivedAt",
  file_ids: "fileIds",
  chat_id: "chatId",
  user_id: "userId",
  folder_id: "folderId",
};

function toCamelCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const transformed = {};
  for (const [key, value] of Object.entries(obj)) {
    transformed[SNAKE_TO_CAMEL[key] ?? key] = toCamelCase(value);
  }
  return transformed;
}

const chatsFetch = async (endpoint, options) =>
  toCamelCase(await apiFetch(`/api/chats${endpoint}`, options));

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
