import { db } from "@/lib/db";
import { useAuthState } from "@/state/useAuthState";
import { useLiveQuery } from "dexie-react-hooks";
import { UI_CONSTANTS } from "@faster-chat/shared";

export function useChatPersistence(chatId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  const chat = useLiveQuery(async () => {
    if (!chatId || userId === null) return null;
    return await db.chats.get(chatId);
  }, [chatId, userId]);

  const messages = useLiveQuery(async () => {
    if (!chatId || userId === null) return [];
    const msgs = await db.getChatMessages(chatId);
    console.log("[DEBUG useChatPersistence] chatId:", chatId, "loaded messages:", msgs?.length, "first msg:", msgs?.[0]);
    return msgs;
  }, [chatId, userId]);

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
