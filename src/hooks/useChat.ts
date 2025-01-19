"use client";
import { ModelId } from "@/types/models";
import type { Message } from "ai";
import { useChat } from "ai/react";
import React, { useEffect, useState } from "react";

export interface UseChatOptions {
  initialMessages?: Message[];
  id?: string;
  model: ModelId;
  onMessagesChange?: (messages: Message[]) => void;
}

export function useChatState({ initialMessages, id, model, onMessagesChange }: UseChatOptions) {
  const [requestStartTime, setRequestStartTime] = useState<number | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id,
    initialMessages: initialMessages || [],
    body: { model },
  });

  const wrappedHandleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setRequestStartTime(performance.now());
    if (process.env.NODE_ENV === "development") {
      console.log(`[Client] Starting stream for model: ${model}`);
    }

    try {
      await originalHandleSubmit(e);
      if (process.env.NODE_ENV === "development") {
        console.log("[Client] Stream completed successfully");
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Client] Stream error:", error);
      }
    } finally {
      const endTime = performance.now();
      if (requestStartTime) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Client] Total streaming time: ${endTime - requestStartTime}ms`);
        }
      }
    }
  };

  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [onMessagesChange, messages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit: wrappedHandleSubmit,
    isLoading,
    error,
    clearChat: () => setMessages([]),
  };
}
