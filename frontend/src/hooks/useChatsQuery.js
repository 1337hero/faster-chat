import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsClient } from "@/lib/chatsClient";
import { useAuthState } from "@/state/useAuthState";
import { getMessageTimestamp } from "@/lib/messageUtils";

// Query key factory - includes userId to prevent cache bleed between users
export const chatKeys = {
  all: (userId) => ["chats", userId],
  list: (userId) => [...chatKeys.all(userId), "list"],
  details: (userId) => [...chatKeys.all(userId), "detail"],
  detail: (userId, id) => [...chatKeys.details(userId), id],
  messages: (userId, chatId) => [...chatKeys.detail(userId, chatId), "messages"],
};

export function useChatsQuery() {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: chatKeys.list(userId),
    queryFn: () => chatsClient.getChats(),
    enabled: userId !== null,
  });
}

export function useChatQuery(chatId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: chatKeys.detail(userId, chatId),
    queryFn: () => chatsClient.getChat(chatId),
    enabled: userId !== null && !!chatId,
  });
}

export function useMessagesQuery(chatId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: chatKeys.messages(userId, chatId),
    queryFn: () => chatsClient.getMessages(chatId),
    enabled: userId !== null && !!chatId,
  });
}

export function useCreateChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: ({ id, title }) => chatsClient.createChat(id, title),
    onSuccess: (newChat) => {
      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return [newChat];
        return [newChat, ...old];
      });
    },
  });
}

export function useUpdateChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: ({ chatId, updates }) => chatsClient.updateChat(chatId, updates),
    onSuccess: (updatedChat, { chatId }) => {
      queryClient.setQueryData(chatKeys.detail(userId, chatId), updatedChat);
      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return old;
        return old.map((chat) => (chat.id === chatId ? updatedChat : chat));
      });
    },
  });
}

export function useDeleteChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: (chatId) => chatsClient.deleteChat(chatId),
    onSuccess: (_, chatId) => {
      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return old;
        return old.filter((chat) => chat.id !== chatId);
      });
      queryClient.removeQueries({ queryKey: chatKeys.detail(userId, chatId) });
      queryClient.removeQueries({ queryKey: chatKeys.messages(userId, chatId) });
    },
  });
}

export function useCreateMessageMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: ({ chatId, message }) => chatsClient.createMessage(chatId, message),

    onMutate: async ({ chatId, message }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(userId, chatId) });
      await queryClient.cancelQueries({ queryKey: chatKeys.list(userId) });

      // Snapshot previous state for rollback
      const previousMessages = queryClient.getQueryData(chatKeys.messages(userId, chatId));
      const previousChats = queryClient.getQueryData(chatKeys.list(userId));

      // Create optimistic message with stable id/createdAt
      const optimisticId = message.id || `temp-${crypto.randomUUID()}`;
      const optimisticCreatedAt = getMessageTimestamp(message);
      const optimisticMessage = {
        id: optimisticId,
        role: message.role,
        content: message.content,
        fileIds: message.fileIds || [],
        model: message.model || null,
        createdAt: optimisticCreatedAt,
      };

      if (message.role === "user") {
        // Insert optimistic message into cache
        queryClient.setQueryData(chatKeys.messages(userId, chatId), (old) => {
          if (!old) return [optimisticMessage];
          return [...old, optimisticMessage];
        });
      }

      // Bump chat to top of list with updated timestamp
      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return old;
        const now = Date.now();
        return old
          .map((chat) => (chat.id === chatId ? { ...chat, updatedAt: now } : chat))
          .sort((a, b) => b.updatedAt - a.updatedAt);
      });

      return { previousMessages, previousChats, optimisticMessage };
    },

    onSuccess: (savedMessage, { chatId }, context) => {
      // Replace optimistic message with saved one from server (by id)
      queryClient.setQueryData(chatKeys.messages(userId, chatId), (old) => {
        if (!old) return [savedMessage];
        let found = false;
        const mapped = old.map((msg) => {
          if (msg.id === savedMessage.id || msg.id === context?.optimisticMessage?.id) {
            found = true;
            return savedMessage;
          }
          return msg;
        });
        return found ? mapped : [...mapped, savedMessage];
      });
    },

    onError: (_error, { chatId }, context) => {
      // Roll back to previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(chatKeys.messages(userId, chatId), context.previousMessages);
      }
      if (context?.previousChats) {
        queryClient.setQueryData(chatKeys.list(userId), context.previousChats);
      }
    },

    onSettled: (_data, _error, { chatId }) => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(userId, chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
    },
  });
}

export function useDeleteMessageMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: ({ chatId, messageId }) => chatsClient.deleteMessage(chatId, messageId),
    onSuccess: (_, { chatId, messageId }) => {
      queryClient.setQueryData(chatKeys.messages(userId, chatId), (old) => {
        if (!old) return old;
        return old.filter((msg) => msg.id !== messageId);
      });
    },
  });
}

export function usePinChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: (chatId) => chatsClient.pinChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.list(userId) });
      const previousChats = queryClient.getQueryData(chatKeys.list(userId));

      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return old;
        return old.map((chat) =>
          chat.id === chatId ? { ...chat, pinnedAt: Date.now() } : chat
        );
      });

      return { previousChats };
    },
    onError: (_, __, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(chatKeys.list(userId), context.previousChats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
    },
  });
}

export function useUnpinChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: (chatId) => chatsClient.unpinChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.list(userId) });
      const previousChats = queryClient.getQueryData(chatKeys.list(userId));

      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return old;
        return old.map((chat) =>
          chat.id === chatId ? { ...chat, pinnedAt: null } : chat
        );
      });

      return { previousChats };
    },
    onError: (_, __, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(chatKeys.list(userId), context.previousChats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
    },
  });
}

export function useArchiveChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: (chatId) => chatsClient.archiveChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.list(userId) });
      const previousChats = queryClient.getQueryData(chatKeys.list(userId));

      // Remove from list (archived chats are filtered out)
      queryClient.setQueryData(chatKeys.list(userId), (old) => {
        if (!old) return old;
        return old.filter((chat) => chat.id !== chatId);
      });

      return { previousChats };
    },
    onError: (_, __, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(chatKeys.list(userId), context.previousChats);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
    },
  });
}

export function useUnarchiveChatMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: (chatId) => chatsClient.unarchiveChat(chatId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
    },
  });
}
