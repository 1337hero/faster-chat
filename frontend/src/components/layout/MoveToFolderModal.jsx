import { createPortal } from "preact/compat";
import { useFolders } from "@/hooks/useFolders";
import { toast } from "sonner";
import { Folder, FolderMinus, Loader2 } from "lucide-preact";
import { FOLDER_CONSTANTS } from "@faster-chat/shared";
import Modal from "@/components/ui/Modal";

const MoveToFolderModal = ({ chat, onClose }) => {
  const { folders, moveChatToFolder, isMoving } = useFolders();

  const handleMove = async (folderId) => {
    try {
      await moveChatToFolder({ chatId: chat.id, folderId });
      toast.success(folderId ? "Chat moved to folder" : "Chat removed from folder");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to move chat");
    }
  };

  const currentFolderId = chat.folder_id || chat.folderId;
  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null;

  return createPortal(
    <Modal isOpen={true} onClose={onClose} title="Move to Folder">
      <p className="text-theme-text-muted mb-3 truncate text-sm">{chat.title || "Untitled Chat"}</p>

      {currentFolder && (
        <div className="bg-theme-surface mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <Folder
            size={14}
            style={{ color: currentFolder.color || FOLDER_CONSTANTS.DEFAULT_COLOR }}
          />
          <span className="text-theme-text-muted">
            Currently in: <span className="text-theme-text">{currentFolder.name}</span>
          </span>
        </div>
      )}

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {currentFolderId && (
          <>
            <button
              onClick={() => handleMove(null)}
              disabled={isMoving}
              className="text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text ease-snappy flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-75 disabled:opacity-50">
              <FolderMinus size={16} className="text-theme-red" />
              <span>Remove from folder</span>
            </button>
            <div className="bg-theme-surface my-2 h-px" />
          </>
        )}

        {folders.length === 0 ? (
          <div className="text-theme-text-muted py-4 text-center text-sm italic">
            No folders yet. Create one from the sidebar.
          </div>
        ) : (
          folders.map((folder) => {
            const isCurrentFolder = folder.id === currentFolderId;
            return (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                disabled={isMoving || isCurrentFolder}
                className={`ease-snappy flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-75 ${
                  isCurrentFolder
                    ? "bg-theme-primary/10 text-theme-primary cursor-default"
                    : "text-theme-text-muted hover:bg-theme-surface-strong hover:text-theme-text disabled:opacity-50"
                }`}>
                <Folder
                  size={16}
                  style={{ color: folder.color || FOLDER_CONSTANTS.DEFAULT_COLOR }}
                />
                <span className="flex-1 truncate">{folder.name}</span>
                {isCurrentFolder && (
                  <span className="text-theme-text-muted text-xs">(current)</span>
                )}
              </button>
            );
          })
        )}
      </div>

      {isMoving && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-theme-text-muted">Moving...</span>
        </div>
      )}
    </Modal>,
    document.body
  );
};

export default MoveToFolderModal;
