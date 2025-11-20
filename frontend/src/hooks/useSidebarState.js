import { UI_CONSTANTS } from "@faster-chat/shared";
import { db } from "@/lib/db";
import { useUiState } from "@/state/useUiState";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "preact/hooks";

export function useSidebarState() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const chats = useLiveQuery(() => db.getChats(), []);
  const isSidebarOpen = useUiState((state) => state.sidebarOpen);
  const setIsSidebarOpen = useUiState((state) => state.setSidebarOpen);
  const toggleSidebar = useUiState((state) => state.toggleSidebar);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < UI_CONSTANTS.BREAKPOINT_MD);
    }

    handleResize();

    if (typeof window === "undefined") return;
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function navigateToChat(chatId, replace = false) {
    navigate({ to: "/chat/$chatId", params: { chatId }, replace });
  }

  async function handleDeleteChat(e, chatId) {
    e.preventDefault();
    e.stopPropagation();

    await db.deleteChat(chatId);

    if (pathname === `/chat/${chatId}`) {
      const remainingChats = await db.getChats();
      const nextChat = remainingChats?.[0];

      if (nextChat) {
        navigateToChat(nextChat.id, true);
      } else {
        const newChat = await db.createChat();
        navigateToChat(newChat.id, true);
      }
    }
  }

  async function handleNewChat() {
    const newChat = await db.createChat();
    navigateToChat(newChat.id);
    if (isMobile) setIsSidebarOpen(false);
  }

  function handleLinkClick() {
    if (isMobile) setIsSidebarOpen(false);
  }

  return {
    chats,
    isSidebarOpen,
    isMobile,
    pathname,
    handleDeleteChat,
    handleNewChat,
    handleLinkClick,
    toggleSidebar,
    setIsSidebarOpen,
  };
}
