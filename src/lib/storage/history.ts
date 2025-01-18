import { Message } from "ai";
import { openDB } from "idb";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  model: string;
  messages: Message[];
}

// Only initialize IndexedDB in browser environment
const getDB = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return openDB<ChatSession>("chat-history", 1, {
    upgrade(db) {
      db.createObjectStore("sessions", { keyPath: "id" });
    },
  });
};

export const addSession = async (session: ChatSession) => {
  const db = await getDB();
  if (!db) return;
  await db.put("sessions", session);
};

export const getSessions = async () => {
  const db = await getDB();
  if (!db) return [];
  return db.getAll("sessions");
};

export const getSession = async (id: string) => {
  const db = await getDB();
  if (!db) return null;
  return db.get("sessions", id);
};

export const deleteSession = async (id: string) => {
  const db = await getDB();
  if (!db) return;
  await db.delete("sessions", id);
};
