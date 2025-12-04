import { useUiState } from "@/state/useUiState";

const MainLayout = ({ sidebar, children }) => {
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);

  return (
    <div className="bg-theme-background flex h-screen w-full">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content - shifts left when sidebar collapses */}
      <main
        className={`bg-theme-background relative z-0 flex h-full flex-1 flex-col transition-[margin] duration-300 ease-snappy ${
          sidebarCollapsed ? "ml-0" : "md:ml-72"
        }`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
