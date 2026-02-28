import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "@/state/useAuthState";
import { chatKeys, folderKeys } from "./queryKeys";
import { FOLDER_CONSTANTS } from "@faster-chat/shared";
import { apiFetch } from "@/lib/api";

// Re-export for backward compatibility
export { folderKeys };

/**
 * Hook for managing chat folders with optimistic updates
 */
export function useFolders() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  const { data, isLoading, error } = useQuery({
    queryKey: folderKeys.list(userId),
    queryFn: () => apiFetch("/api/folders"),
    select: (data) => data.folders || [],
    enabled: userId !== null,
  });

  const createMutation = useMutation({
    mutationFn: (folderData) =>
      apiFetch("/api/folders", {
        method: "POST",
        body: JSON.stringify(folderData),
      }),
    onMutate: async (folderData) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.list(userId) });
      const previousFolders = queryClient.getQueryData(folderKeys.list(userId));

      // Create optimistic folder with temp ID
      const optimisticFolder = {
        id: `temp-${crypto.randomUUID()}`,
        name: folderData.name,
        color: folderData.color || FOLDER_CONSTANTS.DEFAULT_COLOR,
        position: folderData.position ?? FOLDER_CONSTANTS.DEFAULT_POSITION,
        is_collapsed: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      queryClient.setQueryData(folderKeys.list(userId), (old) => {
        if (!old) return { folders: [optimisticFolder] };
        return { folders: [...old.folders, optimisticFolder] };
      });

      return { previousFolders, optimisticFolder };
    },
    onSuccess: (response, _, context) => {
      // Replace optimistic folder with server response
      queryClient.setQueryData(folderKeys.list(userId), (old) => {
        if (!old) return { folders: [response.folder] };
        return {
          folders: old.folders.map((f) =>
            f.id === context.optimisticFolder.id ? response.folder : f
          ),
        };
      });
    },
    onError: (_, __, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(folderKeys.list(userId), context.previousFolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(userId) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }) =>
      apiFetch(`/api/folders/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.list(userId) });
      const previousFolders = queryClient.getQueryData(folderKeys.list(userId));

      // Optimistically update the folder
      queryClient.setQueryData(folderKeys.list(userId), (old) => {
        if (!old) return old;
        return {
          folders: old.folders.map((f) =>
            f.id === id ? { ...f, ...updates, updated_at: Date.now() } : f
          ),
        };
      });

      return { previousFolders };
    },
    onError: (_, __, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(folderKeys.list(userId), context.previousFolders);
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.detail(userId, id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiFetch(`/api/folders/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.list(userId) });
      const previousFolders = queryClient.getQueryData(folderKeys.list(userId));

      // Optimistically remove the folder
      queryClient.setQueryData(folderKeys.list(userId), (old) => {
        if (!old) return old;
        return { folders: old.folders.filter((f) => f.id !== id) };
      });

      return { previousFolders };
    },
    onError: (_, __, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(folderKeys.list(userId), context.previousFolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
    },
  });

  const moveChatMutation = useMutation({
    mutationFn: ({ chatId, folderId }) =>
      apiFetch(`/api/folders/${folderId || "none"}/chats/${chatId}`, {
        method: "PUT",
      }),
    onSettled: (_, __, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
      if (folderId) {
        queryClient.invalidateQueries({ queryKey: folderKeys.chats(userId, folderId) });
      }
    },
  });

  return {
    folders: data || [],
    isLoading,
    error,
    createFolder: createMutation.mutateAsync,
    updateFolder: (id, updates) => updateMutation.mutateAsync({ id, ...updates }),
    deleteFolder: deleteMutation.mutateAsync,
    moveChatToFolder: moveChatMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMoving: moveChatMutation.isPending,
  };
}

/**
 * Hook for fetching chats in a specific folder
 */
export function useFolderChats(folderId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: folderKeys.chats(userId, folderId),
    queryFn: () => apiFetch(`/api/folders/${folderId}/chats`),
    select: (data) => data.chats || [],
    enabled: userId !== null && !!folderId,
  });
}

/**
 * Hook for fetching a single folder
 */
export function useFolder(folderId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: folderKeys.detail(userId, folderId),
    queryFn: () => apiFetch(`/api/folders/${folderId}`),
    select: (data) => data.folder,
    enabled: userId !== null && !!folderId,
  });
}
