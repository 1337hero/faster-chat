import { SidebarChatItem } from './SidebarChatItem';

/**
 * Sidebar chat list component
 * @param {object} props
 * @param {Array} props.chats
 * @param {string} props.currentPath
 * @param {boolean} props.isSidebarOpen
 * @param {Function} props.onDeleteChat
 * @param {Function} props.onLinkClick
 * @param {Function} props.formatDate
 */
export function SidebarChatList({
  chats,
  currentPath,
  isSidebarOpen,
  onDeleteChat,
  onLinkClick,
  formatDate,
}) {
  return (
    <div
      className={`flex-1 overflow-y-auto scrollbar scrollbar-track-transparent scrollbar-thumb-latte-surface2 hover:scrollbar-thumb-latte-overlay0 dark:scrollbar-thumb-macchiato-surface2 dark:hover:scrollbar-thumb-macchiato-overlay0 p-2 [&::-webkit-scrollbar]:w-[0.25rem] ${
        !isSidebarOpen && "md:hidden"
      }`}>
      <nav className="space-y-2" aria-label="Chat History">
        {chats && chats.length > 0 ? (
          chats.map((chat) => (
            <SidebarChatItem
              key={chat.id}
              chat={chat}
              isActive={currentPath === `/chat/${chat.id}`}
              onDelete={onDeleteChat}
              onClick={onLinkClick}
              formatDate={formatDate}
            />
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
            No chats yet. Click "New Chat" to start.
          </div>
        )}
      </nav>
    </div>
  );
}
