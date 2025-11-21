import ConnectionsTab from "@/components/admin/ConnectionsTab";
import ModelsTab from "@/components/admin/ModelsTab";
import UsersTab from "@/components/admin/UsersTab";
import { useAuthState } from "@/state/useAuthState";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";

const tabs = [
  { id: "users", label: "Users" },
  { id: "models", label: "Models" },
  { id: "connections", label: "Connections" },
];

const Admin = () => {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const search = useRouterState({ select: (state) => state.location.search });
  const selectedTab = search?.tab;
  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : "users";

  // Admin-only access
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleTabChange = (tabId) => {
    navigate({
      search: (previous) => {
        const currentSearch = previous ?? {};
        return {
          ...currentSearch,
          tab: tabId === "users" ? undefined : tabId,
        };
      },
      replace: true,
    });
  };

  return (
    <div className="flex h-full flex-col bg-latte-base dark:bg-macchiato-base">
      {/* Header with tabs */}
      <div className="border-b border-latte-surface0 dark:border-macchiato-surface0">
        <div className="flex h-14 items-center px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`border-b-2 px-1 pb-4 pt-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-latte-blue text-latte-text dark:border-macchiato-blue dark:text-macchiato-text"
                    : "border-transparent text-latte-subtext0 hover:text-latte-subtext1 dark:text-macchiato-subtext0 dark:hover:text-macchiato-subtext1"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "users" && <UsersTab />}
        {activeTab === "models" && <ModelsTab />}
        {activeTab === "connections" && <ConnectionsTab />}
      </div>
    </div>
  );
};

export default Admin;
