import { Brain } from "lucide-preact";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatQuery } from "@/hooks/useChatsQuery";
import { useMemoryStatus } from "@/hooks/useMemoryStatus";
import { useAuthState } from "@/state/useAuthState";
import { apiFetch } from "@/lib/api";
import { chatKeys } from "@/hooks/queryKeys";

const ChatMemoryButton = ({ chatId, disabled }) => {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);
  const { data: memoryStatus } = useMemoryStatus();
  const { data: chatData } = useChatQuery(chatId);

  const chatMemoryMutation = useMutation({
    mutationFn: (nextDisabled) =>
      apiFetch(`/api/chats/${chatId}/memory`, {
        method: "PUT",
        body: JSON.stringify({ disabled: nextDisabled }),
      }),
    onMutate: async (nextDisabled) => {
      const queryKey = chatKeys.detail(userId, chatId);
      await queryClient.cancelQueries({ queryKey });
      const previousChat = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (current) =>
        current ? { ...current, memoryDisabled: nextDisabled } : current
      );

      return { previousChat, queryKey };
    },
    onError: (_error, _nextDisabled, context) => {
      if (context?.previousChat) {
        queryClient.setQueryData(context.queryKey, context.previousChat);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(chatKeys.detail(userId, chatId), (current) =>
        current ? { ...current, memoryDisabled: data.disabled } : current
      );
    },
  });

  if (!memoryStatus?.globalEnabled || !memoryStatus?.enabled) {
    return null;
  }

  const chatMemoryDisabled = !!chatData?.memoryDisabled;

  return (
    <button
      type="button"
      onClick={() => chatMemoryMutation.mutate(!chatMemoryDisabled)}
      disabled={disabled || chatMemoryMutation.isPending}
      className={`rounded-lg p-2 transition-colors ${
        chatMemoryDisabled
          ? "text-theme-muted hover:bg-theme-blue/10 hover:text-theme-blue"
          : "bg-theme-blue/20 text-theme-blue"
      }`}
      title={chatMemoryDisabled ? "Memory disabled for this chat" : "Memory active"}
      aria-label={
        chatMemoryDisabled ? "Enable memory for this chat" : "Disable memory for this chat"
      }
      aria-pressed={!chatMemoryDisabled}>
      <Brain size={18} />
    </button>
  );
};

export default ChatMemoryButton;
