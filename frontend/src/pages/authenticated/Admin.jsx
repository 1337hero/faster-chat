import { useAuthState } from "@/state/useAuthState";
import { useReturnToChat } from "@/hooks/useReturnToChat";
import { Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "preact/compat";
import { LayoutGrid } from "lucide-preact";

// Lazy load admin tab components for better code splitting
const UsersTab = lazy(() => import("@/components/admin/UsersTab"));
const ModelsTab = lazy(() => import("@/components/admin/ModelsTab"));
const ConnectionsTab = lazy(() => import("@/components/admin/ConnectionsTab"));
const CustomizeTab = lazy(() => import("@/components/admin/CustomizeTab"));

const tabs = [
  { id: "users", label: "Users" },
  { id: "customize", label: "Customize" },
  { id: "models", label: "Models" },
  { id: "connections", label: "Connections" },
];

const Admin = () => {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const search = useRouterState({ select: (state) => state.location.search });
  const selectedTab = search?.tab;
  const activeTab = tabs.some((tab) => tab.id === selectedTab) ? selectedTab : "users";
  const { returnToChat, isReturning } = useReturnToChat();

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
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <button
            type="button"
            onClick={returnToChat}
            disabled={isReturning}
            className="text-theme-text hover:text-theme-text border-theme-surface hover:border-theme-surface-strong hover:bg-theme-surface flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60">
            <LayoutGrid size={16} />
            <span>Return to chat</span>
          </button>
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
          {activeTab === "customize" && <CustomizeTab />}
          {activeTab === "models" && <ModelsTab />}
          {activeTab === "connections" && <ConnectionsTab />}
        </Suspense>
      </div>
    </div>
  );
};

export default Admin;
