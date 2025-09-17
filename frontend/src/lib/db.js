import { Dexie } from "dexie";

class ChatDatabase extends Dexie {
  constructor() {
    super("ChatDatabase");
    this.version(1).stores({
      chats: "id, created_at, updated_at",
      messages: "id, chatId, created_at",
    });
  }

  async createChat(title) {
    const chat = {
      id: crypto.randomUUID(),
      title,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.chats.add(chat);
    return chat;
  }

  async updateChatTitle(chatId, title) {
    await this.chats.update(chatId, {
      title,
      updated_at: new Date(),
    });
  }

  async addMessage(message) {
    const storedMessage = {
      ...message,
      id: crypto.randomUUID(),
      created_at: new Date(),
    };

    await this.messages.add(storedMessage);
    await this.chats.update(message.chatId, {
      updated_at: new Date(),
    });

    return storedMessage;
  }

  async getChatMessages(chatId) {
    return await this.messages.where("chatId").equals(chatId).sortBy("created_at");
  }

  async getChats() {
    return await this.chats.orderBy("updated_at").reverse().toArray();
  }

  async deleteChat(chatId) {
    await this.transaction("rw", this.chats, this.messages, async () => {
      await this.messages.where("chatId").equals(chatId).delete();
      await this.chats.delete(chatId);
    });
  }
}

export const db = new ChatDatabase();
