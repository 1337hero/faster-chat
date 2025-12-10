import { toast } from "sonner";
import {
  usePinChatMutation,
  useUnpinChatMutation,
  useArchiveChatMutation,
  useDeleteChatMutation,
  useUpdateChatMutation,
} from "@/hooks/useChatsQuery";

export const useChatActions = () => {
  const pinChatMutation = usePinChatMutation();
  const unpinChatMutation = useUnpinChatMutation();
  const archiveChatMutation = useArchiveChatMutation();
  const deleteChatMutation = useDeleteChatMutation();
  const updateChatMutation = useUpdateChatMutation();

  const handlePin = async (chatId) => {
    await pinChatMutation.mutateAsync(chatId);
    toast.success("Chat pinned");
  };

  const handleUnpin = async (chatId) => {
    await unpinChatMutation.mutateAsync(chatId);
    toast.success("Chat unpinned");
  };

  const handleArchive = async (chatId) => {
    await archiveChatMutation.mutateAsync(chatId);
    toast.success("Chat archived");
  };

  const handleDelete = async (chatId) => {
    if (!confirm("Delete this chat?")) return;
    await deleteChatMutation.mutateAsync(chatId);
    toast.success("Chat deleted");
  };

  const handleRename = async (chatId, chats) => {
    const chat = chats?.find((c) => c.id === chatId);
    if (!chat) return;

    const newName = prompt("Rename chat:", chat.title || "");
    if (newName !== null && newName.trim() && newName.trim() !== chat.title) {
      await updateChatMutation.mutateAsync({ chatId, updates: { title: newName.trim() } });
      toast.success("Chat renamed");
    }
  };

  return {
    handlePin,
    handleUnpin,
    handleArchive,
    handleDelete,
    handleRename,
  };
};
