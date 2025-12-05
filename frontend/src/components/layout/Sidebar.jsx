import { useState, useRef, useEffect } from "@preact/compat";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useAppSettings } from "@/state/useAppSettings";
import { useUiState } from "@/state/useUiState";
import {
  usePinChatMutation,
  useUnpinChatMutation,
  useArchiveChatMutation,
  useUpdateChatMutation,
} from "@/hooks/useChatsQuery";
import { searchWithHighlights } from "@/lib/search";
import { toast } from "sonner";
import { LOGO_ICON_NAMES, UI_CONSTANTS } from "@faster-chat/shared";
import * as LucideIcons from "lucide-react";
import { PanelLeftClose, Pin, Search, SquarePen, Trash2, X, Zap } from "lucide-react";
import ChatContextMenu from "./ChatContextMenu";

// Build icon map from shared names
const LOGO_ICONS = LOGO_ICON_NAMES.reduce((acc, name) => {
  acc[name] = LucideIcons[name];
  return acc;
}, {});

// Chat item component - extracted for reuse in pinned and recent sections
const ChatItem = ({
  chat,
  highlighted,
  isActive,
  isRenaming,
  renameValue,
  onSelect,
  onContextMenu,
  onDelete,
  onPin,
  onUnpin,
  onRenameChange,
  onRenameSubmit,
  onRenameKeyDown,
}) => {
  const isPinned = !!chat.pinnedAt;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isRenaming && onSelect(chat.id)}
      onKeyDown={(e) => e.key === "Enter" && !isRenaming && onSelect(chat.id)}
      onContextMenu={(e) => onContextMenu(e, chat)}
      className={`group ease-snappy relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-75 ${
        isActive
          ? "bg-theme-primary/10 text-theme-primary font-medium"
          : "text-theme-text-muted hover:text-theme-text hover:bg-white/5"
      }`}>
      {/* Pin indicator for pinned chats */}
      {isPinned && <Pin size={12} className="text-theme-accent -ml-0.5 flex-shrink-0" />}

      {/* Title or rename input */}
      {isRenaming ? (
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => onRenameKeyDown(e, chat.id)}
          onBlur={() => onRenameSubmit(chat.id)}
          autoFocus
          className="bg-theme-surface text-theme-text focus:ring-theme-primary flex-1 rounded px-2 py-0.5 text-sm outline-none focus:ring-1"
          onClick={(e) => e.stopPropagation()}
        />
      ) : highlighted ? (
        <span
          className="[&_mark]:bg-theme-yellow/30 [&_mark]:text-theme-text flex-1 truncate pr-12 text-sm [&_mark]:rounded-sm"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <span className="flex-1 truncate pr-12 text-sm">{chat.title || "New Chat"}</span>
      )}

      {/* Hover actions - Pin and Delete */}
      {!isRenaming && (
        <div className="absolute top-0 right-0 bottom-0 flex items-center gap-0.5 pr-2">
          <div className="bg-theme-canvas-alt ease-snappy pointer-events-none absolute inset-y-0 -left-6 w-6 bg-gradient-to-l from-current to-transparent opacity-0 transition-opacity duration-75 group-hover:opacity-100" />

          {/* Pin/Unpin button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              isPinned ? onUnpin(chat.id) : onPin(chat.id);
            }}
            className={`ease-snappy translate-x-2 transform-gpu rounded-md p-1 opacity-0 transition-all duration-75 group-hover:translate-x-0 group-hover:opacity-100 ${
              isActive
                ? "hover:bg-theme-primary/10 text-theme-primary"
                : "text-theme-text-muted hover:bg-theme-accent/10 hover:text-theme-accent"
            }`}
            title={isPinned ? "Unpin" : "Pin"}>
            <Pin size={14} className={isPinned ? "fill-current" : ""} />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => onDelete(e, chat.id)}
            className={`ease-snappy translate-x-2 transform-gpu rounded-md p-1 opacity-0 transition-all duration-75 group-hover:translate-x-0 group-hover:opacity-100 ${
              isActive
                ? "hover:bg-theme-primary/10 text-theme-primary"
                : "text-theme-text-muted hover:bg-theme-red/10 hover:text-theme-red"
            }`}
            title="Delete Chat">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const Sidebar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState(null); // { chat, position: {x, y} }
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const searchInputRef = useRef(null);

  // Listen for focus-sidebar-search event (triggered by Ctrl+K)
  useEffect(() => {
    const handleFocusSearch = () => {
      // Small delay to allow sidebar to expand first
      setTimeout(() => searchInputRef.current?.focus(), UI_CONSTANTS.SIDEBAR_FOCUS_DELAY_MS);
    };
    window.addEventListener("focus-sidebar-search", handleFocusSearch);
    return () => window.removeEventListener("focus-sidebar-search", handleFocusSearch);
  }, []);

  const {
    chats,
    isSidebarOpen,
    isMobile,
    pathname,
    handleDeleteChat,
    handleNewChat,
    handleSelectChat,
    setIsSidebarOpen,
  } = useSidebarState();

  const pinChatMutation = usePinChatMutation();
  const unpinChatMutation = useUnpinChatMutation();
  const archiveChatMutation = useArchiveChatMutation();
  const updateChatMutation = useUpdateChatMutation();

  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);
  const appName = useAppSettings((state) => state.appName);
  const logoIcon = useAppSettings((state) => state.logoIcon);
  const LogoIcon = LOGO_ICONS[logoIcon] || Zap;
  const isUtilityRoute = pathname === "/admin" || pathname === "/settings";
  const forceExpanded = isUtilityRoute && !isMobile;
  const effectiveCollapsed = forceExpanded ? false : sidebarCollapsed;

  // Derive filtered chats from search query
  const filteredChats = searchWithHighlights(searchQuery, chats ?? [], "title");

  // Separate pinned and unpinned chats
  const pinnedChats = filteredChats.filter(({ item }) => item.pinnedAt);
  const recentChats = filteredChats.filter(({ item }) => !item.pinnedAt);

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setContextMenu({
      chat,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handlePin = async (chatId) => {
    await pinChatMutation.mutateAsync(chatId);
    toast.success("Chat pinned");
  };

  const handleUnpin = async (chatId) => {
    await unpinChatMutation.mutateAsync(chatId);
    toast.success("Chat unpinned");
  };

  const handleArchive = async (chatId) => {
    await archiveChatMutation.mutateAsync(chatId);
    toast.success("Chat archived");
  };

  const handleRename = (chatId) => {
    const chat = chats?.find((c) => c.id === chatId);
    if (chat) {
      setRenamingChatId(chatId);
      setRenameValue(chat.title || "");
    }
  };

  const handleRenameSubmit = async (chatId) => {
    // Prevent double submission
    if (!renamingChatId) return;

    const trimmedValue = renameValue.trim();
    const originalChat = chats?.find((c) => c.id === chatId);

    // Clear state first to prevent double calls
    setRenamingChatId(null);
    setRenameValue("");

    // Only update if value changed
    if (trimmedValue && trimmedValue !== originalChat?.title) {
      await updateChatMutation.mutateAsync({ chatId, updates: { title: trimmedValue } });
      toast.success("Chat renamed");
    }
  };

  const handleRenameKeyDown = (e, chatId) => {
    if (e.key === "Enter") {
      e.target.blur(); // This will trigger onBlur which calls handleRenameSubmit
    } else if (e.key === "Escape") {
      setRenamingChatId(null);
      setRenameValue("");
    }
  };

  // On desktop: slide off-screen when collapsed
  // On mobile: use translate for open/close
  const getSidebarTransform = () => {
    if (isMobile) {
      return isSidebarOpen ? "translate-x-0" : "-translate-x-full";
    }
    return effectiveCollapsed ? "-translate-x-full" : "translate-x-0";
  };

  const handleLogoClick = async () => {
    if (isUtilityRoute || effectiveCollapsed) {
      await handleNewChat();
      if (!isMobile && sidebarCollapsed) {
        toggleSidebarCollapse();
      }
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="bg-theme-canvas-strong/80 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel - slides completely off-screen when collapsed */}
      <div
        className={`bg-theme-canvas-alt border-theme-surface-strong ease-snappy fixed inset-y-0 left-0 z-50 flex w-72 transform-gpu flex-col border-r transition-transform duration-300 ${getSidebarTransform()}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={handleLogoClick}
            title={
              isUtilityRoute ? "Return to chat" : effectiveCollapsed ? "Expand sidebar" : undefined
            }>
            <div className="bg-theme-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-lg">
              <LogoIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-theme-text overflow-hidden text-xl font-extrabold tracking-tight whitespace-nowrap">
              {appName}
            </h1>
          </div>

          {/* Mobile Close */}
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-theme-overlay hover:text-theme-text md:hidden">
              <X size={20} />
            </button>
          )}

          {/* Desktop Collapse Toggle */}
          {!forceExpanded && !effectiveCollapsed && !isMobile && (
            <button
              onClick={toggleSidebarCollapse}
              className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface0/50 dark:hover:bg-macchiato-surface0/50 hidden rounded-md p-1 transition-colors md:block">
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col gap-4 px-6">
          {/* New Chat */}
          <button
            onClick={handleNewChat}
            className="btn btn-primary flex w-full transform items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            title="New Chat">
            <SquarePen size={18} />
            <span>New Chat</span>
          </button>

          {/* Search */}
          <div className="group relative">
            <div className="relative">
              <Search
                className="text-theme-text-muted group-focus-within:text-theme-accent absolute top-1/2 left-3 -translate-y-1/2 transform transition-colors"
                size={16}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hover:border-theme-surface-strong focus:border-theme-surface-strong focus:bg-theme-surface text-theme-text placeholder-theme-text-muted w-full rounded-lg border border-transparent bg-transparent py-1.5 pr-8 pl-9 text-sm transition-all focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-theme-text-muted hover:text-theme-text absolute top-1/2 right-2 -translate-y-1/2 transform"
                  title="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="bg-theme-surface mx-6 my-4 h-px" />

        {/* History List */}
        <div className="flex-1 space-y-1 overflow-y-auto px-4">
          {/* Pinned Section */}
          {pinnedChats.length > 0 && !searchQuery && (
            <>
              <div className="text-theme-overlay px-2 py-2 text-xs font-bold tracking-widest uppercase opacity-70">
                Pinned
              </div>
              {pinnedChats.map(({ item: chat, highlighted }) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  highlighted={highlighted}
                  isActive={pathname === `/chat/${chat.id}`}
                  isRenaming={renamingChatId === chat.id}
                  renameValue={renameValue}
                  onSelect={handleSelectChat}
                  onContextMenu={handleContextMenu}
                  onDelete={handleDeleteChat}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                  onRenameChange={setRenameValue}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameKeyDown={handleRenameKeyDown}
                />
              ))}
              <div className="bg-theme-surface mx-2 my-2 h-px" />
            </>
          )}

          {/* Recent/Results Section */}
          <div className="text-theme-overlay px-2 py-2 text-xs font-bold tracking-widest uppercase opacity-70">
            {searchQuery ? `Results (${filteredChats.length})` : "Recent"}
          </div>

          {recentChats.length === 0 && pinnedChats.length === 0 && (
            <div className="text-theme-overlay bg-theme-surface/20 border-theme-surface/30 mx-2 rounded-lg border border-dashed py-8 text-center text-sm italic">
              {searchQuery ? "No matching chats found." : "No history found."}
            </div>
          )}

          {(searchQuery ? filteredChats : recentChats).map(({ item: chat, highlighted }) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              highlighted={highlighted}
              isActive={pathname === `/chat/${chat.id}`}
              isRenaming={renamingChatId === chat.id}
              renameValue={renameValue}
              onSelect={handleSelectChat}
              onContextMenu={handleContextMenu}
              onDelete={handleDeleteChat}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onRenameChange={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onRenameKeyDown={handleRenameKeyDown}
            />
          ))}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <ChatContextMenu
            chat={contextMenu.chat}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onPin={handlePin}
            onUnpin={handleUnpin}
            onArchive={handleArchive}
            onDelete={(chatId) => {
              handleDeleteChat({ preventDefault: () => {}, stopPropagation: () => {} }, chatId);
            }}
            onRename={handleRename}
          />
        )}

        {/* Footer */}
        <div className="mt-auto p-4"></div>
      </div>
    </>
  );
};

export default Sidebar;
