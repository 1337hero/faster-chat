import { useChatQuery, useMessagesQuery, useCreateMessageMutation } from "./useChatsQuery";

export function useChatPersistence(chatId) {
  const { data: chat, isLoading: isChatLoading, isError: isChatError } = useChatQuery(chatId);
  const { data: messages } = useMessagesQuery(chatId);
  const createMessageMutation = useCreateMessageMutation();

  async function saveUserMessage(content, currentChatId, fileIds = []) {
    const message = {
      role: "user",
      content,
      fileIds,
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
    isChatLoading,
    isChatError,
    saveUserMessage,
    saveAssistantMessage,
  };
}
