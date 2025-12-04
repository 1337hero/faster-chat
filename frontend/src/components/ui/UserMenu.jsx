import { useAuthState } from "@/state/useAuthState";
import { useEffect, useRef, useState } from "preact/hooks";
import { useNavigate } from "@tanstack/react-router";
import { User, Settings, LogOut, Shield } from "lucide-react";

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
        className="bg-latte-surface0 text-latte-text hover:bg-latte-surface1 dark:bg-macchiato-surface0 dark:text-macchiato-text dark:hover:bg-macchiato-surface1 focus:ring-latte-blue/50 dark:focus:ring-macchiato-blue/50 rounded-xl p-2 transition-all duration-200 hover:scale-105 focus:ring-2 focus:outline-none active:scale-95"
        aria-label="User Menu">
        <User size={20} />
      </button>

      {isOpen && (
        <div
          className="bg-latte-surface0 dark:bg-macchiato-surface0 border-latte-surface1 dark:border-macchiato-surface1 animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border duration-100"
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
                <Shield size={16} />
                <span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => handleNavigate("/settings")}
              className="text-latte-subtext0 dark:text-macchiato-subtext0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="text-latte-red dark:text-macchiato-red hover:bg-latte-red/10 dark:hover:bg-macchiato-red/10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
