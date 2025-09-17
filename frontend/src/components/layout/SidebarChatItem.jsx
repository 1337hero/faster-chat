import { TrashIcon } from '@/components/icons/index';
import { Link } from "@tanstack/react-router";

/**
 * Sidebar chat item component
 * @param {object} props
 * @param {object} props.chat
 * @param {boolean} props.isActive
 * @param {Function} props.onDelete
 * @param {Function} props.onClick
 * @param {Function} props.formatDate
 */
export function SidebarChatItem({
  chat,
  isActive,
  onDelete,
  onClick,
  formatDate,
}) {
  return (
    <Link
      to="/chat/$chatId"
      params={{ chatId: chat.id }}
      onClick={onClick}
      className={`group flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-latte-surface0 dark:hover:bg-macchiato-surface0 hover:shadow-sm ${
        isActive ? "bg-latte-surface0 dark:bg-macchiato-surface0" : ""
      }`}>
      <div className="flex-1">
        <span className="line-clamp-1 block font-medium text-latte-text dark:text-macchiato-text">
          {chat.title || "New Chat"}
        </span>
        <span className="block text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
          {formatDate(chat.updated_at)}
        </span>
      </div>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        className="invisible ml-2 rounded p-1 text-latte-subtext0 dark:text-macchiato-subtext0 group-hover:visible hover:bg-latte-surface1 dark:hover:bg-macchiato-surface1 hover:text-latte-red dark:hover:text-macchiato-red"
        aria-label="Delete chat">
        <TrashIcon className="h-4 w-4" />
      </button>
    </Link>
  );
}
