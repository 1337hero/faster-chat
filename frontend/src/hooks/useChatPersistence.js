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
    return await db.getChatMessages(chatId);
  }, [chatId, userId]);

  async function saveUserMessage(content, currentChatId, fileIds = []) {
    await db.addMessage({
      chatId: currentChatId,
      content,
      role: "user",
      fileIds,
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

  async function saveAssistantMessage(content, currentChatId, model = null) {
    await db.addMessage({
      chatId: currentChatId,
      content,
      role: "assistant",
      model,
    });
  }

  return {
    chat,
    messages,
    saveUserMessage,
    saveAssistantMessage,
  };
}
