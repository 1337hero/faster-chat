import { useChatQuery, useMessagesQuery, useCreateMessageMutation } from "./useChatsQuery";

export function useChatPersistence(chatId) {
  const { data: chat } = useChatQuery(chatId);
  const { data: messages } = useMessagesQuery(chatId);
  const createMessageMutation = useCreateMessageMutation();

  async function saveUserMessage(content, currentChatId, fileIds = []) {
    const message = {
      role: "user",
      content,
      fileIds: fileIds.length > 0 ? fileIds : null,
    };

    return createMessageMutation.mutateAsync({ chatId: currentChatId, message });
  }

  async function saveAssistantMessage(content, currentChatId, model = null) {
    const message = {
      role: "assistant",
      content,
      model,
    };

    return createMessageMutation.mutateAsync({ chatId: currentChatId, message });
  }

  return {
    chat,
    messages: messages ?? [],
    saveUserMessage,
    saveAssistantMessage,
  };
}
