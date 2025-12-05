import { useEffect } from "@preact/compat";
import { useNavigate } from "@tanstack/react-router";
import { useUiState } from "@/state/useUiState";
import { useCreateChatMutation } from "./useChatsQuery";
import { useIsMobile } from "./useIsMobile";
import { getShortcut } from "@faster-chat/shared";

/**
 * Global keyboard shortcuts hook.
 * Shortcut definitions live in @faster-chat/shared/constants/shortcuts.js
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const createChatMutation = useCreateChatMutation();
  const isMobile = useIsMobile();

  const toggleSidebar = useUiState((state) => state.toggleSidebar);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);
  const setSidebarOpen = useUiState((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle sidebar - Ctrl+B
      if (getShortcut("toggleSidebar").check(e)) {
        e.preventDefault();
        isMobile ? toggleSidebar() : toggleSidebarCollapse();
        return;
      }

      // New chat - Ctrl+Shift+O
      if (getShortcut("newChat").check(e)) {
        e.preventDefault();
        createChatMutation.mutateAsync({}).then((newChat) => {
          navigate({ to: "/chat/$chatId", params: { chatId: newChat.id } });
          if (!isMobile && sidebarCollapsed) {
            toggleSidebarCollapse();
          }
        });
        return;
      }

      // Focus search - Ctrl+K
      if (getShortcut("focusSearch").check(e)) {
        e.preventDefault();
        if (isMobile) {
          setSidebarOpen(true);
        } else if (sidebarCollapsed) {
          toggleSidebarCollapse();
        }
        window.dispatchEvent(new CustomEvent("focus-sidebar-search"));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isMobile,
    sidebarCollapsed,
    toggleSidebar,
    toggleSidebarCollapse,
    setSidebarOpen,
    navigate,
    createChatMutation,
  ]);
}
