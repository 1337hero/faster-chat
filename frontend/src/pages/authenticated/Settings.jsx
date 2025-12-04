import { useAuthState } from "@/state/useAuthState";
import { useReturnToChat } from "@/hooks/useReturnToChat";
import { FontSelector } from "@/components/settings/FontSelector";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { LayoutGrid } from "lucide-react";

const Settings = () => {
  const { user } = useAuthState();
  const { returnToChat, isReturning } = useReturnToChat();

  return (
    <div className="bg-theme-canvas flex h-full flex-col">
      {/* Header */}
      <div className="border-theme-surface border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-theme-text text-2xl font-semibold">Settings</h1>
            <p className="text-theme-text-muted mt-1 text-sm">
              Manage your personal preferences and account settings
            </p>
          </div>
          <button
            type="button"
            onClick={returnToChat}
            disabled={isReturning}
            className="text-theme-text hover:text-theme-text mt-1 flex items-center gap-2 rounded-lg border border-theme-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-theme-surface-strong hover:bg-theme-surface disabled:opacity-60">
            <LayoutGrid size={16} />
            <span>Return to chat</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Account Information */}
          <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
            <h2 className="text-theme-text text-lg font-semibold">Account Information</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-theme-text-muted text-sm font-medium">Username</label>
                <p className="text-theme-text mt-1">{user?.username}</p>
              </div>
              <div>
                <label className="text-theme-text-muted text-sm font-medium">Role</label>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium uppercase ${
                      user?.role === "admin"
                        ? "bg-theme-blue/10 text-theme-blue"
                        : "bg-theme-green/10 text-theme-green"
                    }`}>
                    {user?.role}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
            <h2 className="text-theme-text mb-4 text-lg font-semibold">Appearance</h2>
            <ThemeSelector />
          </div>

          {/* Typography */}
          <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
            <h2 className="text-theme-text mb-4 text-lg font-semibold">Typography</h2>
            <FontSelector />
          </div>

          {/* Notifications (Placeholder) */}
          <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
            <h2 className="text-theme-text text-lg font-semibold">Notifications</h2>
            <p className="text-theme-text-muted mt-2 text-sm">
              Notification preferences - Coming soon
            </p>
          </div>

          {/* Privacy (Placeholder) */}
          <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
            <h2 className="text-theme-text text-lg font-semibold">Privacy & Security</h2>
            <p className="text-theme-text-muted mt-2 text-sm">
              Security settings and privacy controls - Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
