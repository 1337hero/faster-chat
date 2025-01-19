import { Message } from 'ai';
import { ModelId } from './models';

export interface UseChatOptions {
  initialMessages?: Message[];
  id?: string;
  model: ModelId;
  onMessagesChange?: (messages: Message[]) => void;
}
