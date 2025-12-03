const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

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

  return data;
}

export const chatsClient = {
  async getChats() {
    const data = await chatsFetch("");
    return data.chats;
  },

  async getChat(chatId) {
    return chatsFetch(`/${chatId}`);
  },

  async createChat(id = null, title = null) {
    return chatsFetch("", {
      method: "POST",
      body: JSON.stringify({ id, title }),
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
};
