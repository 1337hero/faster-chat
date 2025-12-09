import { useEffect, useRef } from "preact/hooks";
import { Pin, PinOff, Archive, Trash2, ExternalLink, TextCursor } from "lucide-preact";

/**
 * Context menu for chat items in sidebar.
 * Triggered by right-click on chat items.
 */
const ChatContextMenu = ({
  chat,
  position,
  onClose,
  onPin,
  onUnpin,
  onArchive,
  onDelete,
  onRename,
}) => {
  const menuRef = useRef(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  const adjustedPosition = { ...position };
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - rect.width - 8;
    }
    if (rect.bottom > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - rect.height - 8;
    }
  }

  const isPinned = !!chat.pinnedAt;

  const menuItems = [
    {
      icon: isPinned ? PinOff : Pin,
      label: isPinned ? "Unpin" : "Pin",
      onClick: () => {
        isPinned ? onUnpin(chat.id) : onPin(chat.id);
        onClose();
      },
    },
    {
      icon: TextCursor,
      label: "Rename",
      onClick: () => {
        onRename(chat.id);
        onClose();
      },
    },
    {
      icon: ExternalLink,
      label: "Open in New Tab",
      onClick: () => {
        window.open(`/chat/${chat.id}`, "_blank");
        onClose();
      },
    },
    {
      icon: Archive,
      label: "Archive",
      onClick: () => {
        onArchive(chat.id);
        onClose();
      },
    },
    { type: "divider" },
    {
      icon: Trash2,
      label: "Delete",
      danger: true,
      onClick: () => {
        onDelete(chat.id);
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="bg-theme-surface border-theme-border animate-in fade-in-0 zoom-in-95 fixed z-[100] min-w-[160px] rounded-lg border p-1 shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="menu"
      aria-orientation="vertical">
      {menuItems.map((item, index) => {
        if (item.type === "divider") {
          return <div key={index} className="bg-theme-border my-1 h-px" />;
        }

        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              item.danger
                ? "text-theme-red hover:bg-theme-red/10"
                : "text-theme-text hover:bg-theme-surface-strong"
            }`}
            role="menuitem">
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default ChatContextMenu;
