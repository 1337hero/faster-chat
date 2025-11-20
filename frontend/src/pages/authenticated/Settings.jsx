import { useAuthState } from "@/state/useAuthState";

const Settings = () => {
  const { user } = useAuthState();

  return (
    <div className="flex h-full flex-col bg-latte-base dark:bg-macchiato-base">
      {/* Header */}
      <div className="border-b border-latte-surface0 px-6 py-4 dark:border-macchiato-surface0">
        <h1 className="text-2xl font-semibold text-latte-text dark:text-macchiato-text">
          Settings
        </h1>
        <p className="mt-1 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
          Manage your personal preferences and account settings
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Account Information */}
          <div className="rounded-lg border border-latte-surface0 bg-latte-mantle p-6 dark:border-macchiato-surface0 dark:bg-macchiato-mantle">
            <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
              Account Information
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-latte-subtext0 dark:text-macchiato-subtext0">
                  Username
                </label>
                <p className="mt-1 text-latte-text dark:text-macchiato-text">{user?.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-latte-subtext0 dark:text-macchiato-subtext0">
                  Role
                </label>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium uppercase ${
                      user?.role === "admin"
                        ? "bg-latte-blue/10 text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue"
                        : "bg-latte-green/10 text-latte-green dark:bg-macchiato-green/10 dark:text-macchiato-green"
                    }`}
                  >
                    {user?.role}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Appearance (Placeholder) */}
          <div className="rounded-lg border border-latte-surface0 bg-latte-mantle p-6 dark:border-macchiato-surface0 dark:bg-macchiato-mantle">
            <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
              Appearance
            </h2>
            <p className="mt-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
              Theme preferences and display settings - Coming soon
            </p>
          </div>

          {/* Notifications (Placeholder) */}
          <div className="rounded-lg border border-latte-surface0 bg-latte-mantle p-6 dark:border-macchiato-surface0 dark:bg-macchiato-mantle">
            <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
              Notifications
            </h2>
            <p className="mt-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
              Notification preferences - Coming soon
            </p>
          </div>

          {/* Privacy (Placeholder) */}
          <div className="rounded-lg border border-latte-surface0 bg-latte-mantle p-6 dark:border-macchiato-surface0 dark:bg-macchiato-mantle">
            <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
              Privacy & Security
            </h2>
            <p className="mt-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
              Security settings and privacy controls - Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
