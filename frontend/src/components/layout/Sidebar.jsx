import { useSidebarState } from "@/hooks/useSidebarState";
import { useUiState } from "@/state/useUiState";
import { MessageSquare, PanelLeftClose, Search, SquarePen, Trash2, X, Zap } from "lucide-react";

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
          className="bg-latte-crust/80 dark:bg-macchiato-crust/80 fixed inset-0 z-40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`bg-latte-mantle dark:bg-macchiato-mantle border-latte-surface1 dark:border-macchiato-surface1 fixed inset-y-0 left-0 z-50 flex transform flex-col border-r transition-all duration-300 ease-in-out md:static ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${sidebarWidthClass} `}>
        {/* Header */}
        <div
          className={`flex items-center ${sidebarCollapsed ? "justify-center p-4" : "justify-between p-6"}`}>
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={handleLogoClick}
            title={logoTitle}>
            <div className="from-latte-blue to-latte-mauve dark:from-macchiato-blue dark:to-macchiato-mauve flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            {!sidebarCollapsed && (
              <h1 className="text-latte-text dark:text-macchiato-text overflow-hidden text-xl font-extrabold tracking-tight whitespace-nowrap">
                Faster Chat
              </h1>
            )}
          </div>

          {/* Mobile Close */}
          {isMobile && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-text dark:hover:text-macchiato-text md:hidden">
              <X size={20} />
            </button>
          )}

          {/* Desktop Collapse Toggle */}
          {!sidebarCollapsed && !isMobile && (
            <button
              onClick={toggleSidebarCollapse}
              className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface0/50 dark:hover:bg-macchiato-surface0/50 hidden rounded-md p-1 transition-colors md:block">
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
                ? "bg-latte-surface0 dark:bg-macchiato-surface0 text-latte-text dark:text-macchiato-text hover:text-latte-mauve dark:hover:text-macchiato-mauve mx-auto h-10 w-10 rounded-xl"
                : "btn btn-mauve w-full rounded-xl px-4 py-2.5 font-medium"
            } `}
            title="New Chat">
            <SquarePen size={sidebarCollapsed ? 20 : 18} />
            {!sidebarCollapsed && <span>New Chat</span>}
          </button>

          {/* Search */}
          <div className="group relative">
            {sidebarCollapsed ? (
              <button className="text-latte-subtext0 dark:text-macchiato-subtext0 hover:bg-latte-surface0 dark:hover:bg-macchiato-surface0 hover:text-latte-text dark:hover:text-macchiato-text mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all">
                <Search size={20} />
              </button>
            ) : (
              <div className="relative">
                <Search
                  className="text-latte-overlay0 dark:text-macchiato-overlay0 group-focus-within:text-latte-blue dark:group-focus-within:text-macchiato-blue absolute top-1/2 left-3 -translate-y-1/2 transform transition-colors"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-latte-crust dark:bg-macchiato-crust border-latte-surface0 dark:border-macchiato-surface0 text-latte-text dark:text-macchiato-text focus:border-latte-blue/50 dark:focus:border-macchiato-blue/50 focus:ring-latte-blue/50 dark:focus:ring-macchiato-blue/50 placeholder-latte-overlay0/70 dark:placeholder-macchiato-overlay0/70 w-full rounded-xl border py-2 pr-3 pl-9 text-sm transition-all focus:ring-1 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        {!sidebarCollapsed && (
          <div className="bg-latte-surface0 dark:bg-macchiato-surface0 mx-6 my-4 h-px" />
        )}

        {/* History List (Hidden when collapsed) */}
        {!sidebarCollapsed && (
          <div className="flex-1 space-y-1 overflow-y-auto px-4 opacity-100 transition-opacity duration-300">
            <div className="text-latte-overlay0 dark:text-macchiato-overlay0 px-2 py-2 text-xs font-bold tracking-widest uppercase opacity-70">
              Recent Activity
            </div>

            {chats?.length === 0 && (
              <div className="text-latte-overlay0 dark:text-macchiato-overlay0 bg-latte-surface0/20 dark:bg-macchiato-surface0/20 border-latte-surface0/30 dark:border-macchiato-surface0/30 mx-2 rounded-lg border border-dashed py-8 text-center text-sm italic">
                No history found.
              </div>
            )}

            {chats?.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`;
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleSelectChat(chat.id)}
                  className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-latte-surface0 dark:bg-macchiato-surface0 text-latte-text dark:text-macchiato-text font-medium shadow-md"
                      : "text-latte-subtext0 dark:text-macchiato-subtext0 hover:bg-latte-surface0/50 dark:hover:bg-macchiato-surface0/50 hover:text-latte-text dark:hover:text-macchiato-text"
                  } `}>
                  <MessageSquare
                    className={`flex-shrink-0 ${isActive ? "text-latte-mauve dark:text-macchiato-mauve" : "text-latte-overlay0 dark:text-macchiato-overlay0"}`}
                    size={18}
                  />
                  <span className="flex-1 truncate pr-6 text-sm">{chat.title || "New Chat"}</span>

                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="hover:bg-latte-red/10 dark:hover:bg-macchiato-red/10 hover:text-latte-red dark:hover:text-macchiato-red absolute right-2 rounded-lg p-1.5 opacity-0 transition-all group-hover:opacity-100"
                    title="Delete Chat">
                    <Trash2 size={14} />
                  </button>
                </button>
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
