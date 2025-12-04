import { useAuthState } from "@/state/useAuthState";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, Shield, User } from "lucide-react";
import { useEffect, useRef, useState } from "preact/hooks";

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
        className="bg-theme-surface border-theme-border hover:border-theme-primary/50 text-theme-text hover:bg-theme-surface-strong focus:ring-theme-blue/50 rounded-xl border p-2 shadow-lg transition-all duration-200 hover:scale-105 focus:ring-2 focus:outline-none active:scale-95"
        aria-label="User Menu">
        <User size={20} />
      </button>

      {isOpen && (
        <div className="bg-theme-surface border-theme-surface-strong animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border shadow-lg duration-100">
          <div className="border-theme-surface-strong/50 flex items-center justify-between border-b p-3">
            <span className="text-theme-text text-normal">{user.username}</span>
            {user.role === "admin" && (
              <span className="bg-theme-blue/10 text-theme-blue mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium">
                Admin
              </span>
            )}
          </div>
          <div className="p-1">
            {user.role === "admin" && (
              <button
                onClick={() => handleNavigate("/admin")}
                className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
                <Shield size={16} />
                <span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => handleNavigate("/settings")}
              className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="text-theme-red hover:bg-theme-red/10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
