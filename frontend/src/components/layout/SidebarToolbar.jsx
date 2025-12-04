import { useUiState } from "@/state/useUiState";
import { PanelLeft, Plus, Search } from "lucide-react";

const SidebarToolbar = ({ onNewChat, onSearch }) => {
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);

  return (
    <div className="pointer-events-auto fixed left-2 top-2 z-[60] flex flex-row gap-0.5 p-1">
      {/* Animated backdrop pill - expands when collapsed, matches ThemeToggle styling */}
      <div
        className={`pointer-events-none absolute inset-0 right-auto -z-10 rounded-xl border transition-[background-color,border-color,box-shadow,width] duration-250 ease-snappy ${
          sidebarCollapsed
            ? "bg-theme-surface border-theme-border shadow-lg w-[108px]"
            : "w-10 border-transparent bg-transparent shadow-none"
        }`}
      />

      {/* Toggle sidebar button - always visible */}
      <button
        onClick={toggleSidebarCollapse}
        className="text-theme-text-muted hover:bg-theme-surface/50 hover:text-theme-text z-10 flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        title={sidebarCollapsed ? "Open Sidebar" : "Close Sidebar"}>
        <PanelLeft size={18} />
      </button>

      {/* Search button - slides in when collapsed */}
      <button
        onClick={onSearch}
        className={`text-theme-text-muted hover:bg-theme-surface/50 hover:text-theme-text flex h-8 w-8 transform-gpu items-center justify-center rounded-md transition-[transform,opacity] ease-snappy ${
          sidebarCollapsed
            ? "translate-x-0 opacity-100 delay-150 duration-250"
            : "pointer-events-none -translate-x-8 opacity-0 delay-0 duration-150"
        }`}
        title="Search">
        <Search size={18} />
      </button>

      {/* New chat button - slides in when collapsed */}
      <button
        onClick={onNewChat}
        className={`text-theme-text-muted hover:bg-theme-surface/50 hover:text-theme-text flex h-8 w-8 transform-gpu items-center justify-center rounded-md transition-[transform,opacity] ease-snappy ${
          sidebarCollapsed
            ? "translate-x-0 opacity-100 delay-150 duration-150"
            : "pointer-events-none -translate-x-8 opacity-0 delay-0 duration-150"
        }`}
        title="New Chat">
        <Plus size={18} />
      </button>
    </div>
  );
};

export default SidebarToolbar;
