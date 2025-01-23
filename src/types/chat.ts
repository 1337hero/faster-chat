import { Message } from 'ai';
import { ModelId } from './models';

export interface ChatOptions {
  id?: string;
  model: ModelId;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

export type PersistentChatOptions = Pick<ChatOptions, 'id' | 'model'>;
