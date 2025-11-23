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

    // Version 3: Add compound indexes for user-scoped queries
    this.version(3).stores({
      chats: "id, userId, created_at, updated_at, [userId+updated_at]",
      messages: "id, chatId, userId, created_at, [chatId+userId]",
    });

    // Version 4: Add support for file attachments
    this.version(4)
      .stores({
        chats: "id, userId, created_at, updated_at, [userId+updated_at]",
        messages: "id, chatId, userId, created_at, [chatId+userId], *fileIds",
      })
      .upgrade(async (tx) => {
        // Migrate existing messages to have fileIds = []
        await tx
          .table("messages")
          .toCollection()
          .modify((message) => {
            message.fileIds = [];
          });
      });

    // Version 5: Add model field to messages for AI responses
    this.version(5)
      .stores({
        chats: "id, userId, created_at, updated_at, [userId+updated_at]",
        messages: "id, chatId, userId, created_at, [chatId+userId], *fileIds, model",
      })
      .upgrade(async (tx) => {
        // Migrate existing messages to have model = null
        await tx
          .table("messages")
          .toCollection()
          .modify((message) => {
            message.model = null;
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
      fileIds: message.fileIds || [],
      model: message.model || null,
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
    if (userId === null) return [];
    return await this.messages
      .where("[chatId+userId]")
      .equals([chatId, userId])
      .sortBy("created_at");
  }

  async getChats() {
    const userId = this.getCurrentUserId();
    if (userId === null) return [];
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
