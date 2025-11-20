import { useAuthState } from "@/state/useAuthState";
import { useEffect, useRef, useState } from "preact/hooks";
import { useNavigate } from "@tanstack/react-router";

const UserIcon = ({ className, size = 20 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

const SettingsIcon = ({ className, size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

const LogOutIcon = ({ className, size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
};

const ShieldIcon = ({ className, size = 16 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
};

export const UserMenu = () => {
  const { user, logout, isLoading } = useAuthState();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavigate = (path) => {
    navigate({ to: path });
    setIsOpen(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-latte-surface0 text-latte-text hover:bg-latte-surface1 dark:bg-macchiato-surface0 dark:text-macchiato-text dark:hover:bg-macchiato-surface1 focus:ring-latte-blue/50 dark:focus:ring-macchiato-blue/50 rounded-xl p-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 active:scale-95"
        aria-label="User Menu">
        <UserIcon size={20} />
      </button>

      {isOpen && (
        <div
          className="bg-latte-surface0 dark:bg-macchiato-surface0 border-latte-surface1 dark:border-macchiato-surface1 animate-in fade-in zoom-in-95 absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border duration-100"
          style={{ boxShadow: "var(--shadow-depth-lg)" }}>
          <div className="border-latte-surface1/50 dark:border-macchiato-surface1/50 border-b p-3">
            <p className="text-latte-text dark:text-macchiato-text text-sm font-bold">
              {user.username}
            </p>
            <p className="text-latte-overlay0 dark:text-macchiato-overlay0 text-xs">
              {user.email || "user@example.com"}
            </p>
            {user.role === "admin" && (
              <span className="bg-latte-blue/10 text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium">
                Admin
              </span>
            )}
          </div>
          <div className="p-1">
            {user.role === "admin" && (
              <button
                onClick={() => handleNavigate("/admin")}
                className="text-latte-subtext0 dark:text-macchiato-subtext0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
                <ShieldIcon size={16} />
                <span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => handleNavigate("/settings")}
              className="text-latte-subtext0 dark:text-macchiato-subtext0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
              <SettingsIcon size={16} />
              <span>Settings</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="text-latte-red dark:text-macchiato-red hover:bg-latte-red/10 dark:hover:bg-macchiato-red/10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50">
              <LogOutIcon size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
