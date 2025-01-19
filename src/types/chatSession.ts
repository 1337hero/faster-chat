import { Message } from "ai";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  model: string;
  messages: Message[];
}