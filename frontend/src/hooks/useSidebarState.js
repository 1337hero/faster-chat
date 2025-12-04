import { useChatsQuery, useDeleteChatMutation, useCreateChatMutation } from "./useChatsQuery";
import { useIsMobile } from "./useIsMobile";
import { useUiState } from "@/state/useUiState";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

export function useSidebarState() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: chats } = useChatsQuery();
  const deleteChatMutation = useDeleteChatMutation();
  const createChatMutation = useCreateChatMutation();
  const isSidebarOpen = useUiState((state) => state.sidebarOpen);
  const setIsSidebarOpen = useUiState((state) => state.setSidebarOpen);
  const toggleSidebar = useUiState((state) => state.toggleSidebar);
  const isMobile = useIsMobile();

  function navigateToChat(chatId, replace = false) {
    navigate({ to: "/chat/$chatId", params: { chatId }, replace });
  }

  async function handleDeleteChat(e, chatId) {
    e.preventDefault();
    e.stopPropagation();

    await deleteChatMutation.mutateAsync(chatId);
    toast.success("Chat deleted");

    if (pathname === `/chat/${chatId}`) {
      const remainingChats = chats?.filter((c) => c.id !== chatId) ?? [];
      const nextChat = remainingChats[0];

      if (nextChat) {
        navigateToChat(nextChat.id, true);
      } else {
        const newChat = await createChatMutation.mutateAsync({});
        navigateToChat(newChat.id, true);
      }
    }
  }

  async function handleNewChat() {
    const newChat = await createChatMutation.mutateAsync({});
    navigateToChat(newChat.id);
    if (isMobile) setIsSidebarOpen(false);
  }

  function handleLinkClick() {
    if (isMobile) setIsSidebarOpen(false);
  }

  function handleSelectChat(chatId, replace = false) {
    navigateToChat(chatId, replace);
    handleLinkClick();
  }

  return {
    chats,
    isSidebarOpen,
    isMobile,
    pathname,
    handleDeleteChat,
    handleNewChat,
    handleSelectChat,
    toggleSidebar,
    setIsSidebarOpen,
  };
}
