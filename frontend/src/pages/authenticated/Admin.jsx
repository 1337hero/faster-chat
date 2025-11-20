import { useState } from "preact/hooks";
import { useAuthState } from "@/state/useAuthState";
import { Navigate } from "@tanstack/react-router";
import UsersTab from "@/components/admin/UsersTab";
import ConnectionsTab from "@/components/admin/ConnectionsTab";
import ModelsTab from "@/components/admin/ModelsTab";

const tabs = [
  { id: "users", label: "Users" },
  { id: "evaluations", label: "Evaluations" },
  { id: "functions", label: "Functions" },
  { id: "settings", label: "Settings" },
];

const Admin = () => {
  const { user } = useAuthState();
  const [activeTab, setActiveTab] = useState("users");

  // Admin-only access
  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-full flex-col bg-latte-base dark:bg-macchiato-base">
      {/* Header with tabs */}
      <div className="border-b border-latte-surface0 dark:border-macchiato-surface0">
        <div className="flex h-14 items-center px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
        {activeTab === "evaluations" && (
          <div className="p-6 text-latte-subtext0 dark:text-macchiato-subtext0">
            Evaluations tab - Coming soon
          </div>
        )}
        {activeTab === "functions" && <ModelsTab />}
        {activeTab === "settings" && <ConnectionsTab />}
      </div>
    </div>
  );
};

export default Admin;
