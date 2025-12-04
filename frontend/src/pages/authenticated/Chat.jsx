import ChatInterface from "@/components/chat/ChatInterface";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useChatQuery, useCreateChatMutation } from "@/hooks/useChatsQuery";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "preact/hooks";

const Chat = ({ chatId }) => {
  const navigate = useNavigate();
  const { isLoading, isError, error } = useChatQuery(chatId);
  const createChatMutation = useCreateChatMutation();
  const hasAttemptedRedirect = useRef(false);

  // Auto-redirect to new chat if current chat is missing/deleted
  if (isError && !hasAttemptedRedirect.current && !createChatMutation.isPending) {
    hasAttemptedRedirect.current = true;
    createChatMutation.mutate(
      {},
      {
        onSuccess: (newChat) => {
          navigate({
            to: "/chat/$chatId",
            params: { chatId: newChat.id },
            replace: true,
          });
        },
      }
    );
  }

  const handleCreateNewChat = () => {
    createChatMutation.mutate(
      {},
      {
        onSuccess: (newChat) => {
          navigate({
            to: "/chat/$chatId",
            params: { chatId: newChat.id },
            replace: true,
          });
        },
      }
    );
  };

  if (isLoading || createChatMutation.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-latte-subtext0 dark:text-macchiato-subtext0">
          {createChatMutation.isPending ? "Redirecting to a new chat..." : "Loading chat..."}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <ErrorBanner
          message={
            createChatMutation.error?.message || error?.message || "We couldn't load this chat."
          }
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCreateNewChat}
            className="btn-blue rounded-xl px-4 py-2 text-sm font-semibold text-white">
            Create new chat
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/", replace: true })}
            className="text-latte-text dark:text-macchiato-text bg-latte-surface1 dark:bg-macchiato-surface1 hover:bg-latte-surface2 dark:hover:bg-macchiato-surface2 rounded-xl px-4 py-2 text-sm font-semibold transition">
            Go home
          </button>
        </div>
      </div>
    );
  }

  return <ChatInterface chatId={chatId} />;
};

export default Chat;
