import * as LucideIcons from "lucide-react";
import { PanelLeftClose, Search, SquarePen, Trash2, X, Zap } from "lucide-react";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useUiState } from "@/state/useUiState";
import { useAppSettings } from "@/state/useAppSettings";
import { LOGO_ICON_NAMES } from "@faster-chat/shared";

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
  const sidebarWidthClass = sidebarCollapsed ? "w-20" : "w-72";
  const shouldLogoStartNewChat = pathname.startsWith("/admin") || pathname.startsWith("/settings");

  const handleLogoClick = async () => {
    if (shouldLogoStartNewChat) {
      await handleNewChat();
      return;
    }

    if (sidebarCollapsed) {
      toggleSidebarCollapse();
    }
  };

  const logoTitle = shouldLogoStartNewChat
    ? "Start a new chat"
    : sidebarCollapsed
      ? "Expand Sidebar"
      : undefined;

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && isMobile && (
        <div
          className="bg-theme-canvas-strong/80 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`bg-theme-canvas-alt border-theme-surface-strong fixed inset-y-0 left-0 z-50 flex transform flex-col border-r transition-all duration-300 ease-in-out md:static ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${sidebarWidthClass} `}>
        {/* Header */}
        <div
          className={`flex items-center ${sidebarCollapsed ? "justify-center p-4" : "justify-between p-6"}`}>
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={handleLogoClick}
            title={logoTitle}>
            <div className="bg-theme-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-lg">
              <LogoIcon className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <h1 className="text-theme-text overflow-hidden text-xl font-extrabold tracking-tight whitespace-nowrap">
                {appName}
              </h1>
            )}
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
          {!sidebarCollapsed && !isMobile && (
            <button
              onClick={toggleSidebarCollapse}
              className="text-theme-overlay hover:text-theme-text hover:bg-theme-surface/50 hidden rounded-md p-1 transition-colors md:block">
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* Primary Actions */}
        <div className={`flex flex-col gap-4 ${sidebarCollapsed ? "px-2" : "px-6"}`}>
          {/* New Chat */}
          <button
            onClick={handleNewChat}
            className={`flex transform items-center justify-center gap-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
              sidebarCollapsed
                ? "bg-theme-surface text-theme-text hover:text-theme-primary mx-auto h-10 w-10 rounded-xl"
                : "btn btn-primary w-full rounded-xl px-4 py-2.5 font-medium"
            } `}
            title="New Chat">
            <SquarePen size={sidebarCollapsed ? 20 : 18} />
            {!sidebarCollapsed && <span>New Chat</span>}
          </button>

          {/* Search */}
          <div className="group relative">
            {sidebarCollapsed ? (
              <button className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all">
                <Search size={20} />
              </button>
            ) : (
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
            )}
          </div>
        </div>

        {/* Divider */}
        {!sidebarCollapsed && <div className="bg-theme-surface mx-6 my-4 h-px" />}

        {/* History List (Hidden when collapsed) */}
        {!sidebarCollapsed && (
          <div className="flex-1 space-y-1 overflow-y-auto px-4 opacity-100 transition-opacity duration-300">
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
                  className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150 ${
                    isActive
                      ? "bg-theme-primary/10 text-theme-primary font-medium"
                      : "text-theme-text-muted hover:text-theme-text hover:bg-white/5"
                  } `}>
                  <span className="flex-1 truncate pr-6 text-sm">{chat.title || "New Chat"}</span>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`absolute right-2 rounded-md p-1 opacity-0 transition-all group-hover:opacity-100 ${
                      isActive
                        ? "hover:bg-theme-primary/10 text-theme-primary"
                        : "hover:bg-theme-red/10 hover:text-theme-red"
                    }`}
                    title="Delete Chat">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Spacer if collapsed to push settings down */}
        {sidebarCollapsed && <div className="flex-1" />}

        {/* Footer */}
        <div className={`mt-auto p-4 ${sidebarCollapsed ? "flex justify-center" : ""}`}></div>
      </div>
    </>
  );
};

export default Sidebar;
