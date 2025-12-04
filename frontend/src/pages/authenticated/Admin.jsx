import { useAuthState } from "@/state/useAuthState";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "preact/compat";

// Lazy load admin tab components for better code splitting
const UsersTab = lazy(() => import("@/components/admin/UsersTab"));
const ModelsTab = lazy(() => import("@/components/admin/ModelsTab"));
const ConnectionsTab = lazy(() => import("@/components/admin/ConnectionsTab"));
const CustomizeTab = lazy(() => import("@/components/admin/CustomizeTab"));

const tabs = [
  { id: "users", label: "Users" },
  { id: "models", label: "Models" },
  { id: "connections", label: "Connections" },
  { id: "customize", label: "Customize" },
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
    <div className="bg-theme-canvas flex h-full flex-col">
      {/* Header with tabs */}
      <div className="border-theme-surface border-b">
        <div className="flex h-14 items-center px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`border-b-2 px-1 pt-4 pb-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-theme-blue text-theme-text"
                    : "text-theme-text-muted hover:text-theme-text-subtle border-transparent"
                }`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="text-theme-text-muted">Loading...</div>
            </div>
          }>
          {activeTab === "users" && <UsersTab />}
          {activeTab === "models" && <ModelsTab />}
          {activeTab === "connections" && <ConnectionsTab />}
          {activeTab === "customize" && <CustomizeTab />}
        </Suspense>
      </div>
    </div>
  );
};

export default Admin;
