import { useNavigate } from "@tanstack/react-router";
import { useState } from "preact/hooks";
import {
  Folder as FolderIcon,
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeft,
} from "lucide-preact";
import { useFolder, useFolderChats, useFolders } from "@/hooks/useFolders";
import { useCreateChatMutation } from "@/hooks/useChatsQuery";
import { useChatActions } from "@/hooks/useChatActions";
import { useUiState } from "@/state/useUiState";
import { toast } from "sonner";
import { FOLDER_CONSTANTS, FOLDER_COLORS } from "@faster-chat/shared";
import ChatContextMenu from "@/components/layout/ChatContextMenu";
import MoveToFolderModal from "@/components/layout/MoveToFolderModal";

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ChatItem = ({ chat, onClick, onContextMenu }) => (
  <button
    onClick={onClick}
    onContextMenu={(e) => onContextMenu(e, chat)}
    className="hover:bg-theme-surface ease-snappy group border-theme-border/50 flex w-full items-center gap-4 border-b px-2 py-4 text-left transition-colors last:border-b-0">
    <div className="min-w-0 flex-1">
      <h3 className="text-theme-text truncate font-medium">{chat.title || "Untitled Chat"}</h3>
      {chat.preview && (
        <p className="text-theme-text-muted mt-0.5 truncate text-sm">{chat.preview}</p>
      )}
    </div>
    <span className="text-theme-text-muted shrink-0 text-xs">{formatDate(chat.updated_at)}</span>
  </button>
);

const EmptyState = ({ folderName, onNewChat }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
    <div className="bg-theme-surface rounded-full p-4">
      <MessageSquare size={32} className="text-theme-text-muted" />
    </div>
    <div className="text-center">
      <h3 className="text-theme-text mb-1 text-lg font-medium">No chats yet</h3>
      <p className="text-theme-text-muted text-sm">Start a conversation in {folderName}</p>
    </div>
    <button
      onClick={onNewChat}
      className="bg-theme-primary hover:bg-theme-primary/90 ease-snappy flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors">
      <Plus size={18} />
      New Chat
    </button>
  </div>
);

const FolderHeader = ({ folder, onUpdate, onDelete, onToggleSidebar, sidebarCollapsed }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder?.name || "");
  const [editColor, setEditColor] = useState(folder?.color || FOLDER_CONSTANTS.DEFAULT_COLOR);

  const handleSubmit = async () => {
    const nameChanged = editName.trim() !== folder.name;
    const colorChanged = editColor !== (folder.color || FOLDER_CONSTANTS.DEFAULT_COLOR);

    if (!editName.trim() || (!nameChanged && !colorChanged)) {
      setIsEditing(false);
      return;
    }
    try {
      const updates = {};
      if (nameChanged) updates.name = editName.trim();
      if (colorChanged) updates.color = editColor;
      await onUpdate(updates);
      setIsEditing(false);
      toast.success("Folder updated");
    } catch (err) {
      toast.error(err.message || "Failed to update folder");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${folder.name}"? Chats will be moved to All Chats.`)) return;
    try {
      await onDelete();
      toast.success("Folder deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete folder");
    }
  };

  if (!folder) return null;

  return (
    <div className="flex items-center gap-3 pb-6">
      {/* Sidebar toggle when collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={onToggleSidebar}
          className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface ease-snappy -ml-2 rounded-lg p-2 transition-colors"
          title="Open sidebar">
          <PanelLeft size={20} />
        </button>
      )}

      <div
        className="shrink-0 rounded-lg p-2"
        style={{
          backgroundColor: `${isEditing ? editColor : folder.color || FOLDER_CONSTANTS.DEFAULT_COLOR}20`,
        }}>
        <FolderIcon
          size={24}
          style={{ color: isEditing ? editColor : folder.color || FOLDER_CONSTANTS.DEFAULT_COLOR }}
        />
      </div>

      {isEditing ? (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              autoFocus
              maxLength={FOLDER_CONSTANTS.MAX_NAME_LENGTH}
              className="bg-theme-surface text-theme-text border-theme-border focus:ring-theme-primary flex-1 rounded-lg border px-3 py-1.5 text-xl font-bold focus:ring-2 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              className="text-theme-text-muted ease-snappy p-1.5 transition-colors hover:text-green-500">
              <Check size={18} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-theme-text-muted ease-snappy p-1.5 transition-colors hover:text-red-500">
              <X size={18} />
            </button>
          </div>
          {/* Color picker */}
          <div className="flex items-center gap-1.5">
            {FOLDER_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setEditColor(color)}
                className={`ease-snappy h-6 w-6 rounded-full transition-all ${
                  editColor === color
                    ? "ring-theme-text ring-offset-theme-canvas scale-110 ring-2 ring-offset-2"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      ) : (
        <h1 className="text-theme-text min-w-0 flex-1 truncate text-2xl font-bold">
          {folder.name}
        </h1>
      )}

      {!isEditing && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              setEditName(folder.name);
              setEditColor(folder.color || FOLDER_CONSTANTS.DEFAULT_COLOR);
              setIsEditing(true);
            }}
            className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface ease-snappy rounded-lg p-2 transition-colors"
            title="Edit folder">
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="text-theme-text-muted ease-snappy rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-500"
            title="Delete folder">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default function Folder({ folderId }) {
  const navigate = useNavigate();
  const { data: folder, isLoading: folderLoading } = useFolder(folderId);
  const { data: chats, isLoading: chatsLoading } = useFolderChats(folderId);
  const { updateFolder, deleteFolder } = useFolders();
  const createChatMutation = useCreateChatMutation();
  const {
    handlePin,
    handleUnpin,
    handleArchive,
    handleDelete: handleDeleteChat,
    handleRename,
  } = useChatActions();

  const sidebarCollapsed = useUiState((state) => state.sidebarCollapsed);
  const toggleSidebarCollapse = useUiState((state) => state.toggleSidebarCollapse);

  // Context menu and modal state
  const [contextMenu, setContextMenu] = useState(null);
  const [movingChat, setMovingChat] = useState(null);

  const handleNewChat = async () => {
    try {
      const newChat = await createChatMutation.mutateAsync({ folderId });
      navigate({ to: `/chat/${newChat.id}` });
    } catch (err) {
      toast.error(err.message || "Failed to create chat");
    }
  };

  const handleChatClick = (chatId) => {
    navigate({ to: `/chat/${chatId}` });
  };

  const handleUpdate = (updates) => updateFolder(folderId, updates);

  const handleDeleteFolder = async () => {
    await deleteFolder(folderId);
    navigate({ to: "/" });
  };

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setContextMenu({ chat, position: { x: e.clientX, y: e.clientY } });
  };

  if (folderLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-text-muted">Loading...</div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-theme-text text-xl font-medium">Folder not found</h2>
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-theme-primary hover:underline">
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Centered content container */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-6 pt-8">
        {/* Header */}
        <FolderHeader
          folder={folder}
          onUpdate={handleUpdate}
          onDelete={handleDeleteFolder}
          onToggleSidebar={toggleSidebarCollapse}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* New Chat Input */}
        <button
          onClick={handleNewChat}
          className="bg-theme-surface hover:bg-theme-surface-hover border-theme-border ease-snappy mb-6 flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors">
          <Plus size={20} className="text-theme-text-muted" />
          <span className="text-theme-text-muted">New chat in {folder.name}</span>
        </button>

        {/* Chat List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-theme-text-muted">Loading chats...</div>
            </div>
          ) : chats?.length > 0 ? (
            <div>
              {chats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  onClick={() => handleChatClick(chat.id)}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </div>
          ) : (
            <EmptyState folderName={folder.name} onNewChat={handleNewChat} />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ChatContextMenu
          chat={contextMenu.chat}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onArchive={handleArchive}
          onDelete={handleDeleteChat}
          onRename={() => handleRename(contextMenu.chat.id, chats)}
          onMoveToFolder={setMovingChat}
        />
      )}

      {/* Move to Folder Modal */}
      {movingChat && <MoveToFolderModal chat={movingChat} onClose={() => setMovingChat(null)} />}
    </div>
  );
}
