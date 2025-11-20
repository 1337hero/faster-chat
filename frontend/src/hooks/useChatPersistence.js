import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { UI_CONSTANTS } from "@faster-chat/shared";

export function useChatPersistence(chatId) {
  const chat = useLiveQuery(async () => {
    if (!chatId) return null;
    return await db.chats.get(chatId);
  }, [chatId]);

  const messages = useLiveQuery(async () => {
    if (!chatId) return [];
    return await db.getChatMessages(chatId);
  }, [chatId]);

  async function saveUserMessage(content, currentChatId) {
    await db.addMessage({
      chatId: currentChatId,
      content,
      role: "user",
    });

    const isFirstMessage = messages?.length === 0;
    if (isFirstMessage) {
      const title =
        content.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) +
        (content.length > UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH
          ? UI_CONSTANTS.CHAT_TITLE_ELLIPSIS
          : "");
      await db.updateChatTitle(currentChatId, title);
    }
  }

  async function saveAssistantMessage(content, currentChatId) {
    await db.addMessage({
      chatId: currentChatId,
      content,
      role: "assistant",
    });
  }

  return {
    chat,
    messages,
    saveUserMessage,
    saveAssistantMessage,
  };
}
