import { useAuthState } from "@/state/useAuthState";

const Settings = () => {
  const { user } = useAuthState();

  return (
    <div className="bg-latte-base dark:bg-macchiato-base flex h-full flex-col">
      {/* Header */}
      <div className="border-latte-surface0 dark:border-macchiato-surface0 border-b px-6 py-4">
        <h1 className="text-latte-text dark:text-macchiato-text text-2xl font-semibold">
          Settings
        </h1>
        <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-1 text-sm">
          Manage your personal preferences and account settings
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Account Information */}
          <div className="border-latte-surface0 bg-latte-mantle dark:border-macchiato-surface0 dark:bg-macchiato-mantle rounded-lg border p-6">
            <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
              Account Information
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-latte-subtext0 dark:text-macchiato-subtext0 text-sm font-medium">
                  Username
                </label>
                <p className="text-latte-text dark:text-macchiato-text mt-1">{user?.username}</p>
              </div>
              <div>
                <label className="text-latte-subtext0 dark:text-macchiato-subtext0 text-sm font-medium">
                  Role
                </label>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium uppercase ${
                      user?.role === "admin"
                        ? "bg-latte-blue/10 text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue"
                        : "bg-latte-green/10 text-latte-green dark:bg-macchiato-green/10 dark:text-macchiato-green"
                    }`}>
                    {user?.role}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Appearance (Placeholder) */}
          <div className="border-latte-surface0 bg-latte-mantle dark:border-macchiato-surface0 dark:bg-macchiato-mantle rounded-lg border p-6">
            <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
              Appearance
            </h2>
            <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 text-sm">
              Theme preferences and display settings - Coming soon
            </p>
          </div>

          {/* Notifications (Placeholder) */}
          <div className="border-latte-surface0 bg-latte-mantle dark:border-macchiato-surface0 dark:bg-macchiato-mantle rounded-lg border p-6">
            <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
              Notifications
            </h2>
            <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 text-sm">
              Notification preferences - Coming soon
            </p>
          </div>

          {/* Privacy (Placeholder) */}
          <div className="border-latte-surface0 bg-latte-mantle dark:border-macchiato-surface0 dark:bg-macchiato-mantle rounded-lg border p-6">
            <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
              Privacy & Security
            </h2>
            <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 text-sm">
              Security settings and privacy controls - Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
