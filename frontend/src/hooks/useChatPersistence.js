import { useChatQuery, useMessagesQuery, useCreateMessageMutation } from "./useChatsQuery";

export function useChatPersistence(chatId) {
  const { data: chat, isLoading: isChatLoading, isError: isChatError } = useChatQuery(chatId);
  const { data: messages } = useMessagesQuery(chatId);
  const createMessageMutation = useCreateMessageMutation();

  async function saveUserMessage({ id, content, fileIds = [], createdAt, model = null }, currentChatId) {
    const message = {
      id,
      role: "user",
      content,
      fileIds,
      createdAt,
      model,
    };

    return createMessageMutation.mutateAsync({ chatId: currentChatId, message });
  }

  async function saveAssistantMessage({ id, content, model = null, createdAt }, currentChatId) {
    const message = {
      id,
      role: "assistant",
      content,
      model,
      createdAt,
    };

    return createMessageMutation.mutateAsync({ chatId: currentChatId, message });
  }

  return {
    chat,
    messages:
      messages?.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt ?? msg.created_at ?? null,
      })) ?? [],
    isChatLoading,
    isChatError,
    saveUserMessage,
    saveAssistantMessage,
  };
}
