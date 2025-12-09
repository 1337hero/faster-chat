import { useNavigate } from "@tanstack/react-router";
import { useState } from "preact/hooks";
import { Folder as FolderIcon, MessageSquare, Plus, Trash2, Pencil, Check, X } from "lucide-preact";
import { useFolder, useFolderChats, useFolders } from "@/hooks/useFolders";
import { useCreateChatMutation } from "@/hooks/useChatsQuery";
import { toast } from "sonner";
import { FOLDER_CONSTANTS } from "@faster-chat/shared";

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ChatItem = ({ chat, onClick }) => (
  <button
    onClick={onClick}
    className="hover:bg-theme-surface-hover ease-snappy group flex w-full flex-col gap-1 rounded-lg p-4 text-left transition-colors">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-theme-text line-clamp-1 font-medium">{chat.title || "Untitled Chat"}</h3>
      <span className="text-theme-text-muted text-xs whitespace-nowrap">
        {formatDate(chat.updated_at)}
      </span>
    </div>
    <p className="text-theme-text-muted line-clamp-2 text-sm">
      {chat.preview || "No messages yet"}
    </p>
  </button>
);

const EmptyState = ({ folderName, onNewChat }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
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

const FolderHeader = ({ folder, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder?.name || "");

  const handleSubmit = async () => {
    if (!editName.trim() || editName === folder.name) {
      setIsEditing(false);
      return;
    }
    try {
      await onUpdate({ name: editName.trim() });
      setIsEditing(false);
      toast.success("Folder renamed");
    } catch (err) {
      toast.error(err.message || "Failed to rename folder");
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
    <div className="border-theme-border flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: `${folder.color}${FOLDER_CONSTANTS.ICON_BG_OPACITY}` }}>
          <FolderIcon size={24} style={{ color: folder.color || FOLDER_CONSTANTS.DEFAULT_COLOR }} />
        </div>

        {isEditing ? (
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
              className="bg-theme-surface text-theme-text border-theme-border focus:ring-theme-primary rounded-lg border px-3 py-1.5 text-xl font-semibold focus:ring-2 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              className="text-theme-text-muted ease-snappy p-1 transition-colors hover:text-green-500">
              <Check size={18} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-theme-text-muted ease-snappy p-1 transition-colors hover:text-red-500">
              <X size={18} />
            </button>
          </div>
        ) : (
          <h1 className="text-theme-text text-2xl font-semibold">{folder.name}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isEditing && (
          <>
            <button
              onClick={() => {
                setEditName(folder.name);
                setIsEditing(true);
              }}
              className="text-theme-text-muted hover:text-theme-text hover:bg-theme-surface ease-snappy rounded-lg p-2 transition-colors"
              title="Rename folder">
              <Pencil size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="text-theme-text-muted ease-snappy rounded-lg p-2 transition-colors hover:bg-red-500/10 hover:text-red-500"
              title="Delete folder">
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default function Folder({ folderId }) {
  const navigate = useNavigate();
  const { data: folder, isLoading: folderLoading } = useFolder(folderId);
  const { data: chats, isLoading: chatsLoading } = useFolderChats(folderId);
  const { updateFolder, deleteFolder } = useFolders();
  const createChatMutation = useCreateChatMutation();

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

  const handleDelete = async () => {
    await deleteFolder(folderId);
    navigate({ to: "/" });
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
    <div className="flex h-full flex-col">
      <FolderHeader folder={folder} onUpdate={handleUpdate} onDelete={handleDelete} />

      {/* New Chat Input */}
      <div className="border-theme-border border-b px-6 py-4">
        <button
          onClick={handleNewChat}
          className="bg-theme-surface hover:bg-theme-surface-hover border-theme-border ease-snappy flex w-full items-center gap-3 rounded-xl border px-4 py-3 transition-colors">
          <Plus size={20} className="text-theme-text-muted" />
          <span className="text-theme-text-muted">New chat in {folder.name}</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="text-theme-text-muted">Loading chats...</div>
          </div>
        ) : chats?.length > 0 ? (
          <div className="space-y-1">
            {chats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} onClick={() => handleChatClick(chat.id)} />
            ))}
          </div>
        ) : (
          <EmptyState folderName={folder.name} onNewChat={handleNewChat} />
        )}
      </div>
    </div>
  );
}
