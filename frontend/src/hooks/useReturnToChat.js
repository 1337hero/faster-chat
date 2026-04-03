import { useChatNavigation } from "./useChatNavigation";
import { useChatsQuery, useCreateChatMutation } from "./useChatsQuery";

export function useReturnToChat() {
  const { data: chats } = useChatsQuery();
  const createChatMutation = useCreateChatMutation();
  const { navigateToChat } = useChatNavigation();

  const returnToChat = async () => {
    const existingChat = chats?.[0];

    if (existingChat) {
      navigateToChat(existingChat.id);
      return;
    }

    const newChat = await createChatMutation.mutateAsync({});
    navigateToChat(newChat.id);
  };

  return {
    returnToChat,
    isReturning: createChatMutation.isPending,
  };
}
