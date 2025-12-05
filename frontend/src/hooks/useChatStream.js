import { DefaultChatTransport } from "ai";
import { useChat as useAIChat } from "@ai-sdk/react";
import { useMemo, useRef } from "preact/hooks";
import { deduplicateMessages, ensureTimestamp, getMessageTimestamp } from "@/lib/messageUtils";
import { MESSAGE_CONSTANTS } from "@faster-chat/shared";

function trimMessageHistory(messages) {
  const trimmed = messages.slice(-MESSAGE_CONSTANTS.MAX_HISTORY);
  return trimmed.filter((message) => {
    if (message.role !== "assistant") return true;
    if (!message.parts?.length) return false;
    const hasText = message.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0
    );
    return hasText;
  });
}

function formatMessagesForTransport(messages) {
  const pruned = trimMessageHistory(messages);
  return pruned.map((message) => ({
    id: message.id ?? crypto.randomUUID(),
    role: message.role,
    content: (message.parts ?? []).map((part) => (part.type === "text" ? part.text : "")).join(""),
  }));
}

export function useChatStream({ chatId, model, persistedMessages, onMessageComplete }) {
  const modelRef = useRef(model);
  modelRef.current = model;

  const persistedMessagesRef = useRef(persistedMessages);
  persistedMessagesRef.current = persistedMessages;

  const messageTimestampsRef = useRef(new Map());

  // Messages are pre-formatted by TanStack Query select, just ensure stable timestamps
  const formattedMessages = (persistedMessages ?? []).map((msg) =>
    ensureTimestamp(msg, messageTimestampsRef)
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chats/${chatId}/completion`,
        prepareSendMessagesRequest: ({ messages: outgoingMessages }) => {
          // Convert persisted messages to transport format
          const persistedForTransport = (persistedMessagesRef.current ?? []).map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: [{ type: "text", text: msg.content ?? "" }],
          }));

          // Merge persisted history with new messages from SDK
          // SDK messages that aren't in persisted are the new ones being sent
          const persistedIds = new Set(persistedForTransport.map((m) => m.id));
          const newMessages = (outgoingMessages ?? []).filter((m) => !persistedIds.has(m.id));
          const allMessages = [...persistedForTransport, ...newMessages];

          const normalized = formatMessagesForTransport(allMessages);

          // Extract fileIds from the last message (user message)
          const lastMessage = outgoingMessages?.[outgoingMessages.length - 1];
          const fileIds = lastMessage?.fileIds || [];

          return {
            body: {
              model: modelRef.current,
              systemPromptId: "default",
              messages: normalized,
              fileIds,
            },
          };
        },
      }),
    [chatId]
  );

  const {
    messages: streamingMessages,
    sendMessage,
    status,
    error,
    stop,
  } = useAIChat({
    id: chatId,
    messages: [], // SDK state starts empty; persisted messages are merged in prepareSendMessagesRequest
    transport,
    onFinish: async ({ message }) => {
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      if (onMessageComplete && content.trim()) {
        await onMessageComplete({
          id: message.id,
          content,
          createdAt: getMessageTimestamp(message),
        });
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Attach current model to streaming assistant messages
  const streamingMessagesWithModel = streamingMessages.map((msg) => ({
    ...ensureTimestamp(msg, messageTimestampsRef),
    model: msg.role === "assistant" ? modelRef.current : msg.model,
  }));

  // Merge persisted messages from server with any actively streaming message
  const messages = isStreaming
    ? deduplicateMessages([...formattedMessages, ...streamingMessagesWithModel])
    : formattedMessages;

  async function send({ id, content, fileIds = [], createdAt }) {
    const messageId = id || crypto.randomUUID();
    const timestamp = createdAt ?? Date.now();

    const message = {
      id: messageId,
      role: "user",
      parts: [{ type: "text", text: content }],
      createdAt: timestamp,
    };

    if (fileIds.length > 0) {
      message.fileIds = fileIds;
    }

    messageTimestampsRef.current.set(message.id, message.createdAt);
    await sendMessage(message);
  }

  return {
    messages,
    send,
    stop,
    status,
    error,
    isStreaming,
  };
}
