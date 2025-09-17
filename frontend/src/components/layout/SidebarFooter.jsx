import { SettingsIcon } from '@/components/icons/index';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/**
 * Sidebar footer component
 * @param {object} props
 * @param {boolean} props.isSidebarOpen
 */
export function SidebarFooter({ isSidebarOpen }) {
  return (
    <div
      className={`border-t border-latte-surface0 dark:border-macchiato-surface0 p-4 ${
        !isSidebarOpen && "md:hidden"
      }`}>
      <div className="flex items-center gap-2">
        <button
          className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm text-latte-text dark:text-macchiato-text hover:bg-latte-surface0 dark:hover:bg-macchiato-surface0 hover:shadow-sm"
          onClick={() => {
            /* TODO: Implement settings */
          }}
          aria-label="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
          <span>Settings</span>
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
