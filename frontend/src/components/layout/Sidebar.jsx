import { Button } from '@/components/ui/button';
import { MenuIcon, PlusIcon } from '@/components/icons/index';
import { useSidebarState } from '@/hooks/useSidebarState';
import { formatDate } from '@/lib/utils';
import { SidebarHeader } from './SidebarHeader';
import { SidebarFooter } from './SidebarFooter';
import { SidebarChatList } from './SidebarChatList';

export function Sidebar() {
  const {
    chats,
    isSidebarOpen,
    isMobile,
    pathname,
    handleDeleteChat,
    handleNewChat,
    handleLinkClick,
    toggleSidebar,
    setIsSidebarOpen,
  } = useSidebarState();

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 rounded-md bg-latte-surface0 dark:bg-macchiato-surface0 p-2 text-latte-text dark:text-macchiato-text"
          aria-label="Open sidebar">
          <MenuIcon className="h-6 w-6" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : "relative h-full"
        } ${
          isSidebarOpen ? "w-[90%] md:w-80" : "md:w-20"
        } flex flex-col bg-latte-mantle dark:bg-macchiato-mantle border-r border-latte-surface1 dark:border-macchiato-surface1 shadow-lg dark:shadow-black/50`}
      >
        <SidebarHeader isSidebarOpen={isSidebarOpen} onToggle={toggleSidebar} />

        <div className={`p-4 ${!isSidebarOpen && "md:hidden"}`}>
          <Button onClick={handleNewChat} className="w-full justify-start gap-2">
            <PlusIcon className="h-5 w-5" />
            New Chat
          </Button>
        </div>

        <SidebarChatList
          chats={chats}
          currentPath={pathname}
          isSidebarOpen={isSidebarOpen}
          onDeleteChat={handleDeleteChat}
          onLinkClick={handleLinkClick}
          formatDate={formatDate}
        />

        <SidebarFooter isSidebarOpen={isSidebarOpen} />
      </aside>
    </>
  );
}
