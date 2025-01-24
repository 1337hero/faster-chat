import { db } from "@/lib/db";
import { PersistentChatOptions } from "@/types/chat";
import { StoredMessage } from "@/types/database";
import { useChat } from "ai/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function usePersistentChat({ id: chatId, model }: PersistentChatOptions) {
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  // Use reactive queries for chat and messages
  const currentChat = useLiveQuery(async () => {
    if (!chatId) return undefined;
    return await db.chats.get(chatId);
  }, [chatId]);

  // Initialize chat with stored messages
  const storedMessages = useLiveQuery(async () => {
    if (!chatId) return [];
    return await db.getChatMessages(chatId);
  }, [chatId]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    //setMessages,
  } = useChat({
    api: "/api/chat",
    id: chatId,
    body: {
      model,
      systemPromptId: "default", // We start with the default system prompt
    },
    initialMessages:
      storedMessages?.map((msg) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
      })) || [],
    onFinish: async (message) => {
      if (currentChat) {
        await persistMessage(message.content, "assistant", currentChat.id);
      }
    },
  });

  // Handle message persistence
  const persistMessage = useCallback(
    async (content: string, role: "user" | "assistant", chatId: string): Promise<StoredMessage> => {
      try {
        const message = await db.addMessage({
          chatId,
          content,
          role,
        });
        return message;
      } catch (error) {
        console.error(`Error persisting ${role} message:`, error);
        throw error;
      }
    },
    []
  );

  // Submit handler
  // Determine appropriate system prompt based on message content
  const determineSystemPrompt = (content: string): string => {
    const lowerContent = content.toLowerCase();

    // Check for programming-related keywords
    if (
      lowerContent.includes("code") ||
      lowerContent.includes("programming") ||
      lowerContent.includes("function") ||
      lowerContent.includes("bug") ||
      lowerContent.includes("error")
    ) {
      return "programmer";
    }

    // Check for math-related keywords
    if (
      lowerContent.includes("math") ||
      lowerContent.includes("calculate") ||
      lowerContent.includes("equation") ||
      lowerContent.includes("solve")
    ) {
      return "math";
    }

    return "default";
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!input.trim()) return;

      try {
        setError(null);

        if (!chatId) {
          const newChat = await db.createChat();
          router.push(`/chat/${newChat.id}`);
          return;
        }

        // Determine system prompt based on input content
        const systemPromptId = determineSystemPrompt(input);

        // Update the body with the determined system prompt
        const updatedBody = {
          model,
          systemPromptId,
        };

        // Call original submit with updated body
        await originalHandleSubmit(e, { body: updatedBody });

        if (currentChat) {
          await persistMessage(input, "user", currentChat.id);

          if (!currentChat.title) {
            const title = input.slice(0, 50) + (input.length > 50 ? "..." : "");
            await db.updateChatTitle(currentChat.id, title);
          }
        }
      } catch (error) {
        console.error("Error in handleSubmit:", error);
        setError(error instanceof Error ? error : new Error("Failed to process message"));
      }
    },
    [currentChat, chatId, input, originalHandleSubmit, persistMessage, router]
  );

  const isLoading = currentChat === undefined && !!chatId;

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    currentChat,
  };
}
