import { useNavigate } from "@tanstack/react-router";
import { useChatsQuery, useCreateChatMutation } from "./useChatsQuery";

export function useReturnToChat() {
  const { data: chats } = useChatsQuery();
  const createChatMutation = useCreateChatMutation();
  const navigate = useNavigate();

  const returnToChat = async () => {
    const existingChat = chats?.[0];

    if (existingChat) {
      navigate({ to: "/chat/$chatId", params: { chatId: existingChat.id } });
      return;
    }

    const newChat = await createChatMutation.mutateAsync({});
    navigate({ to: "/chat/$chatId", params: { chatId: newChat.id } });
  };

  return {
    returnToChat,
    isReturning: createChatMutation.isPending,
  };
}
