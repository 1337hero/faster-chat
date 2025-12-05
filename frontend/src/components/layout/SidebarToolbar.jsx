import { ToolbarButton, ToolbarGroup } from "@/components/ui/ToolbarGroup";
import { useUiState } from "@/state/useUiState";
import { PanelLeft, Plus, Search } from "lucide-react";

const SidebarToolbar = ({ onNewChat, onSearch }) => {
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);

  // When sidebar open: negative margin pulls toolbar behind sidebar
  // When collapsed: sits normally in the flex layout
  return (
    <ToolbarGroup
      className={`ease-snappy transition-[margin] duration-300 ${
        sidebarCollapsed ? "ml-0" : "-ml-[280px]"
      }`}>
      <ToolbarButton onClick={toggleSidebarCollapse} title="Open Sidebar">
        <PanelLeft size={18} />
      </ToolbarButton>

      <ToolbarButton onClick={onSearch} title="Search">
        <Search size={18} />
      </ToolbarButton>

      <ToolbarButton onClick={onNewChat} title="New Chat">
        <Plus size={18} />
      </ToolbarButton>
    </ToolbarGroup>
  );
};

export default SidebarToolbar;
