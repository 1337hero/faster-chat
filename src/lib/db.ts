import Dexie, { Table } from 'dexie';
import { nanoid } from 'nanoid';

export interface Chat {
  id: string;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: Date;
  isPartial?: boolean;
}

class ChatDatabase extends Dexie {
  chats!: Table<Chat>;
  messages!: Table<StoredMessage>;

  constructor() {
    super('ChatDatabase');
    this.version(1).stores({
      chats: 'id, created_at, updated_at',
      messages: 'id, chatId, created_at'
    });
  }

  async createChat(title?: string): Promise<Chat> {
    const chat: Chat = {
      id: nanoid(),
      title,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await this.chats.add(chat);
    return chat;
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    await this.chats.update(chatId, {
      title,
      updated_at: new Date()
    });
  }

  async addMessage(message: Omit<StoredMessage, 'id' | 'created_at'>): Promise<StoredMessage> {
    const storedMessage: StoredMessage = {
      ...message,
      id: nanoid(),
      created_at: new Date()
    };
    
    await this.messages.add(storedMessage);
    await this.chats.update(message.chatId, {
      updated_at: new Date()
    });
    
    return storedMessage;
  }

  async getChatMessages(chatId: string): Promise<StoredMessage[]> {
    return await this.messages
      .where('chatId')
      .equals(chatId)
      .sortBy('created_at');
  }

  async getChats(): Promise<Chat[]> {
    return await this.chats
      .orderBy('updated_at')
      .reverse()
      .toArray();
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.transaction('rw', this.chats, this.messages, async () => {
      await this.messages.where('chatId').equals(chatId).delete();
      await this.chats.delete(chatId);
    });
  }
}

export const db = new ChatDatabase();