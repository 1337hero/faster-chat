import { Dexie } from "dexie";
import { useAuthState } from "@/state/useAuthState";

class ChatDatabase extends Dexie {
  constructor() {
    super("ChatDatabase");

    // Version 1: Original schema
    this.version(1).stores({
      chats: "id, created_at, updated_at",
      messages: "id, chatId, created_at",
    });

    // Version 2: Add userId column for multi-user support
    this.version(2)
      .stores({
        chats: "id, userId, created_at, updated_at",
        messages: "id, chatId, userId, created_at",
      })
      .upgrade(async (tx) => {
        // Migrate existing data to have userId = null (guest data)
        await tx
          .table("chats")
          .toCollection()
          .modify((chat) => {
            chat.userId = null;
          });
        await tx
          .table("messages")
          .toCollection()
          .modify((message) => {
            message.userId = null;
          });
      });
  }

  /**
   * Get the current user ID from auth state
   * Returns null if not authenticated (guest mode)
   */
  getCurrentUserId() {
    const user = useAuthState.getState().user;
    return user ? user.id : null;
  }

  async createChat(title) {
    const chat = {
      id: crypto.randomUUID(),
      title,
      userId: this.getCurrentUserId(),
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
      userId: this.getCurrentUserId(),
      created_at: new Date(),
    };

    await this.messages.add(storedMessage);
    await this.chats.update(message.chatId, {
      updated_at: new Date(),
    });

    return storedMessage;
  }

  async getChatMessages(chatId) {
    const userId = this.getCurrentUserId();
    return await this.messages.where({ chatId, userId }).sortBy("created_at");
  }

  async getChats() {
    const userId = this.getCurrentUserId();
    return await this.chats.where("userId").equals(userId).reverse().sortBy("updated_at");
  }

  async deleteChat(chatId) {
    await this.transaction("rw", this.chats, this.messages, async () => {
      await this.messages.where("chatId").equals(chatId).delete();
      await this.chats.delete(chatId);
    });
  }
}

export const db = new ChatDatabase();
