import { useUiState } from "@/state/useUiState";
import { useRouterState } from "@tanstack/react-router";

const MainLayout = ({ sidebar, children }) => {
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const forceExpanded = pathname === "/admin" || pathname === "/settings";
  const effectiveCollapsed = forceExpanded ? false : sidebarCollapsed;

  return (
    <div className="bg-theme-background flex h-screen w-full">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content - shifts left when sidebar collapses */}
      <main
        className={`bg-theme-background ease-snappy relative z-0 flex h-full flex-1 flex-col transition-[margin] duration-300 ${
          effectiveCollapsed ? "ml-0" : "md:ml-72"
        }`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
