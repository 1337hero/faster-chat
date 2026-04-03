import { ToolbarButton, ToolbarGroup } from "@/components/ui/ToolbarGroup";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUiState } from "@/state/useUiState";
import { PanelLeft, Plus, Search } from "lucide-preact";

const SidebarToolbar = ({ onNewChat, onSearch }) => {
  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);
  const toggleSidebar = useUiState((state) => state.toggleSidebar);
  const isMobile = useIsMobile();

  const handleToggle = isMobile ? toggleSidebar : toggleSidebarCollapse;

  return (
    <ToolbarGroup
      className={`ease-snappy transition-[margin] duration-300 ${
        isMobile ? "ml-0" : sidebarCollapsed ? "ml-0" : "-ml-[280px]"
      }`}>
      <ToolbarButton onClick={handleToggle} title="Open Sidebar">
        <PanelLeft size={18} />
      </ToolbarButton>

      <ToolbarButton onClick={onSearch} title="Search" className="hidden md:flex">
        <Search size={18} />
      </ToolbarButton>

      <ToolbarButton onClick={onNewChat} title="New Chat">
        <Plus size={18} />
      </ToolbarButton>
    </ToolbarGroup>
  );
};

export default SidebarToolbar;
