import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/index';

/**
 * Sidebar header component
 * @param {object} props
 * @param {boolean} props.isSidebarOpen
 * @param {() => void} props.onToggle
 */
export function SidebarHeader({ isSidebarOpen, onToggle }) {
  return (
    <div className="flex items-center justify-between p-4">
      <h1
        className={`font-display text-xl font-bold text-latte-text dark:text-macchiato-text ${
          !isSidebarOpen && "md:hidden"
        }`}>
        ⚡️ Faster Chat
      </h1>
      <button
        onClick={onToggle}
        className="rounded-md p-1 text-latte-text dark:text-macchiato-text hover:bg-latte-surface0 dark:hover:bg-macchiato-surface0"
        aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
        {isSidebarOpen ? (
          <ChevronLeftIcon className="h-6 w-6" />
        ) : (
          <ChevronRightIcon className="hidden md:block h-6 w-6" />
        )}
      </button>
    </div>
  );
}
