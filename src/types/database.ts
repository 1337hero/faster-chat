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
  role: "user" | "assistant";
  created_at: Date;
  isPartial?: boolean;
}
