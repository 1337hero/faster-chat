import { useAuthState } from "@/state/useAuthState";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import { useNavigate } from "@tanstack/react-router";
import { Download, LogOut, Settings, Shield, User } from "lucide-preact";

export const UserMenu = () => {
  const { user, logout, isLoading } = useAuthState();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton
        className="text-theme-text-muted hover:bg-theme-surface-strong/50 hover:text-theme-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        aria-label="User Menu">
        <User size={18} />
      </MenuButton>

      <MenuItems className="bg-theme-surface border-theme-surface-strong animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border shadow-lg duration-100">
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
            <MenuItem
              as="button"
              onClick={() => navigate({ to: "/admin" })}
              className="text-theme-text-muted hover:text-theme-text data-[focus]:bg-theme-surface-strong/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
              <Shield size={16} />
              <span>Admin Panel</span>
            </MenuItem>
          )}
          <MenuItem
            as="button"
            onClick={() => navigate({ to: "/settings" })}
            className="text-theme-text-muted hover:text-theme-text data-[focus]:bg-theme-surface-strong/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
            <Settings size={16} />
            <span>Settings</span>
          </MenuItem>
          <MenuItem
            as="button"
            onClick={() => navigate({ to: "/import" })}
            className="text-theme-text-muted hover:text-theme-text data-[focus]:bg-theme-surface-strong/50 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors">
            <Download size={16} />
            <span>Import Chats</span>
          </MenuItem>
          <MenuItem
            as="button"
            onClick={handleLogout}
            disabled={isLoading}
            className="text-theme-red hover:bg-theme-red/10 data-[focus]:bg-theme-red/10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50">
            <LogOut size={16} />
            <span>Sign Out</span>
          </MenuItem>
        </div>
      </MenuItems>
    </Menu>
  );
};
