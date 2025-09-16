import { db } from "@/lib/db";
import { PersistentChatOptions } from "@/types/chat";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useChat as useAIChat } from "ai/react";

export function useChat({ id: initialChatId, model }: PersistentChatOptions) {
  const [chatId, setChatId] = useState(initialChatId);
  const router = useRouter();

  // Direct database queries - no abstraction needed
  const chat = useLiveQuery(
    async () => {
      if (!chatId) return null;
      return await db.chats.get(chatId);
    },
    [chatId]
  );

  const storedMessages = useLiveQuery(
    async () => {
      if (!chatId) return [];
      return await db.getChatMessages(chatId);
    },
    [chatId]
  );

  // AI chat with integrated persistence
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: aiSubmit,
    isLoading: submissionLoading,
    error,
  } = useAIChat({
    api: "/api/chat",
    id: chatId,
    body: {
      model,
      systemPromptId: "default" // No magic, just defaults
    },
    initialMessages: storedMessages || [],
    onFinish: async (message) => {
      // Persist assistant message directly
      if (chatId) {
        await db.addMessage({
          chatId,
          content: message.content,
          role: "assistant",
        });
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    let currentChatId = chatId;

    // Create chat on first message
    if (!currentChatId) {
      const newChat = await db.createChat();
      currentChatId = newChat.id;
      setChatId(currentChatId);
      router.push(`/chat/${currentChatId}`);

      // Re-submit will happen on next render with chatId set
      return;
    }

    // Submit to AI
    await aiSubmit(e);

    // Persist user message
    await db.addMessage({
      chatId: currentChatId,
      content: trimmedInput,
      role: "user",
    });

    // Update title on first message
    if (!storedMessages?.length) {
      const title = trimmedInput.slice(0, 50) + (trimmedInput.length > 50 ? "..." : "");
      await db.updateChatTitle(currentChatId, title);
    }
  };

  // Sync chatId with prop changes
  useEffect(() => {
    setChatId(initialChatId);
  }, [initialChatId]);

  // Simple loading state
  const isLoading = (chatId && !chat) || submissionLoading;

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    currentChat: chat,
  };
}