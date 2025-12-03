import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsClient } from "@/lib/chatsClient";
import { useAuthState } from "@/state/useAuthState";

export const chatKeys = {
  all: ["chats"],
  lists: () => [...chatKeys.all, "list"],
  list: () => chatKeys.lists(),
  details: () => [...chatKeys.all, "detail"],
  detail: (id) => [...chatKeys.details(), id],
  messages: (chatId) => [...chatKeys.detail(chatId), "messages"],
};

export function useChatsQuery() {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: () => chatsClient.getChats(),
    enabled: userId !== null,
  });
}

export function useChatQuery(chatId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => chatsClient.getChat(chatId),
    enabled: userId !== null && !!chatId,
  });
}

export function useMessagesQuery(chatId) {
  const userId = useAuthState((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: chatKeys.messages(chatId),
    queryFn: () => chatsClient.getMessages(chatId),
    enabled: userId !== null && !!chatId,
  });
}

export function useCreateChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }) => chatsClient.createChat(id, title),
    onSuccess: (newChat) => {
      queryClient.setQueryData(chatKeys.list(), (old) => {
        if (!old) return [newChat];
        return [newChat, ...old];
      });
    },
  });
}

export function useUpdateChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, updates }) => chatsClient.updateChat(chatId, updates),
    onSuccess: (updatedChat, { chatId }) => {
      queryClient.setQueryData(chatKeys.detail(chatId), updatedChat);
      queryClient.setQueryData(chatKeys.list(), (old) => {
        if (!old) return old;
        return old.map((chat) => (chat.id === chatId ? updatedChat : chat));
      });
    },
  });
}

export function useDeleteChatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId) => chatsClient.deleteChat(chatId),
    onSuccess: (_, chatId) => {
      queryClient.setQueryData(chatKeys.list(), (old) => {
        if (!old) return old;
        return old.filter((chat) => chat.id !== chatId);
      });
      queryClient.removeQueries({ queryKey: chatKeys.detail(chatId) });
      queryClient.removeQueries({ queryKey: chatKeys.messages(chatId) });
    },
  });
}

export function useCreateMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, message }) => chatsClient.createMessage(chatId, message),
    onSuccess: (savedMessage, { chatId }) => {
      queryClient.setQueryData(chatKeys.messages(chatId), (old) => {
        if (!old) return [savedMessage];
        return [...old, savedMessage];
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}

export function useDeleteMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, messageId }) => chatsClient.deleteMessage(chatId, messageId),
    onSuccess: (_, { chatId, messageId }) => {
      queryClient.setQueryData(chatKeys.messages(chatId), (old) => {
        if (!old) return old;
        return old.filter((msg) => msg.id !== messageId);
      });
    },
  });
}
