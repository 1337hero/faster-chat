import { useUiState } from "@/state/useUiState";
import { PanelLeft, Plus, Search } from "lucide-react";

const SidebarToolbar = ({ onNewChat, onSearch }) => {
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);

  // When sidebar open: negative margin pulls toolbar behind sidebar
  // When collapsed: sits normally in the flex layout
  return (
    <div
      className={`relative flex flex-row gap-0.5 p-1 transition-[margin] duration-300 ease-snappy ${
        sidebarCollapsed ? "ml-0" : "-ml-[280px]"
      }`}>
      {/* Backdrop pill - matches ThemeToggle styling */}
      <div className="bg-theme-surface border-theme-border pointer-events-none absolute inset-0 -z-10 rounded-xl border shadow-lg" />

      {/* Toggle sidebar button */}
      <button
        onClick={toggleSidebarCollapse}
        className="text-theme-text-muted hover:bg-theme-surface-strong/50 hover:text-theme-text z-10 flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        title="Open Sidebar">
        <PanelLeft size={18} />
      </button>

      {/* Search button */}
      <button
        onClick={onSearch}
        className="text-theme-text-muted hover:bg-theme-surface-strong/50 hover:text-theme-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        title="Search">
        <Search size={18} />
      </button>

      {/* New chat button */}
      <button
        onClick={onNewChat}
        className="text-theme-text-muted hover:bg-theme-surface-strong/50 hover:text-theme-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        title="New Chat">
        <Plus size={18} />
      </button>
    </div>
  );
};

export default SidebarToolbar;
