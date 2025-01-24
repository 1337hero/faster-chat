import { ModelId } from "./models";

export interface PersistentChatOptions {
  id?: string;
  model: ModelId;
}

export interface ChatBody {
  model: ModelId;
  systemPromptId: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
}
