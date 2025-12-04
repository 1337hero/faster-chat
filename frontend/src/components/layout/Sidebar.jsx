import { useSidebarState } from "@/hooks/useSidebarState";
import { useAppSettings } from "@/state/useAppSettings";
import { useUiState } from "@/state/useUiState";
import { LOGO_ICON_NAMES } from "@faster-chat/shared";
import * as LucideIcons from "lucide-react";
import { PanelLeftClose, Search, SquarePen, Trash2, X, Zap } from "lucide-react";

// Build icon map from shared names
const LOGO_ICONS = LOGO_ICON_NAMES.reduce((acc, name) => {
  acc[name] = LucideIcons[name];
  return acc;
}, {});

const Sidebar = () => {
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

  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);
  const appName = useAppSettings((state) => state.appName);
  const logoIcon = useAppSettings((state) => state.logoIcon);
  const LogoIcon = LOGO_ICONS[logoIcon] || Zap;
  const isUtilityRoute = pathname === "/admin" || pathname === "/settings";
  const forceExpanded = isUtilityRoute && !isMobile;
  const effectiveCollapsed = forceExpanded ? false : sidebarCollapsed;

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
        className={`bg-theme-canvas-alt border-theme-surface-strong fixed inset-y-0 left-0 z-50 flex w-72 transform-gpu flex-col border-r transition-transform duration-300 ease-snappy ${getSidebarTransform()}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={handleLogoClick}
            title={isUtilityRoute ? "Return to chat" : effectiveCollapsed ? "Expand sidebar" : undefined}>
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
                type="text"
                placeholder="Search"
                className="hover:border-theme-surface-strong focus:border-theme-surface-strong focus:bg-theme-surface text-theme-text placeholder-theme-text-muted w-full rounded-lg border border-transparent bg-transparent py-1.5 pr-3 pl-9 text-sm transition-all focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="bg-theme-surface mx-6 my-4 h-px" />

        {/* History List */}
        <div className="flex-1 space-y-1 overflow-y-auto px-4">
          <div className="text-theme-overlay px-2 py-2 text-xs font-bold tracking-widest uppercase opacity-70">
            Recent Activity
          </div>

          {chats?.length === 0 && (
            <div className="text-theme-overlay bg-theme-surface/20 border-theme-surface/30 mx-2 rounded-lg border border-dashed py-8 text-center text-sm italic">
              No history found.
            </div>
          )}

          {chats?.map((chat) => {
            const isActive = pathname === `/chat/${chat.id}`;
            return (
              <div
                key={chat.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectChat(chat.id)}
                onKeyDown={(e) => e.key === "Enter" && handleSelectChat(chat.id)}
                className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-75 ease-snappy ${
                  isActive
                    ? "bg-theme-primary/10 text-theme-primary font-medium"
                    : "text-theme-text-muted hover:text-theme-text hover:bg-white/5"
                } `}>
                <span className="flex-1 truncate pr-6 text-sm">{chat.title || "New Chat"}</span>

                {/* Delete button - GPU-accelerated slide-in from right */}
                <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
                  <div className="bg-theme-canvas-alt pointer-events-none absolute inset-y-0 -left-6 w-6 bg-gradient-to-l from-current to-transparent opacity-0 transition-opacity duration-75 ease-snappy group-hover:opacity-100" />
                  <button
                    type="button"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`translate-x-2 transform-gpu rounded-md p-1 transition-transform duration-75 ease-snappy group-hover:translate-x-0 ${
                      isActive
                        ? "hover:bg-theme-primary/10 text-theme-primary"
                        : "text-theme-text-muted hover:bg-theme-red/10 hover:text-theme-red"
                    }`}
                    title="Delete Chat">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto p-4"></div>
      </div>
    </>
  );
};

export default Sidebar;
