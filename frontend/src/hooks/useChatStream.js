import { DefaultChatTransport } from "ai";
import { useChat as useAIChat } from "@ai-sdk/react";
import { useMemo, useRef } from "preact/hooks";
import { deduplicateMessages, ensureTimestamp, getMessageTimestamp } from "@/lib/messageUtils";
import { MESSAGE_CONSTANTS } from "@faster-chat/shared";

function trimMessageHistory(messages) {
  return messages.slice(-MESSAGE_CONSTANTS.MAX_HISTORY).filter((message) => {
    if (message.role !== "assistant") return true;
    if (!message.parts?.length) return false;
    return message.parts.some((part) => part.type === "text" && part.text.trim().length > 0);
  });
}

function formatMessagesForTransport(messages) {
  const pruned = trimMessageHistory(messages);
  return pruned.map((message) => ({
    id: message.id ?? crypto.randomUUID(),
    role: message.role,
    content: (message.parts ?? []).map((part) => (part.type === "text" ? part.text : "")).join(""),
    fileIds: message.fileIds || [],
  }));
}

export function useChatStream({
  chatId,
  model,
  webSearchEnabled,
  memoryEnabled,
  persistedMessages,
  onMessageComplete,
}) {
  const modelRef = useRef(model);
  modelRef.current = model;

  const webSearchRef = useRef(webSearchEnabled);
  webSearchRef.current = webSearchEnabled;

  const memoryEnabledRef = useRef(memoryEnabled);
  memoryEnabledRef.current = memoryEnabled;

  const persistedMessagesRef = useRef(persistedMessages);
  persistedMessagesRef.current = persistedMessages;

  const messageTimestampsRef = useRef(new Map());

  const formattedMessages = (persistedMessages ?? []).map((msg) =>
    ensureTimestamp(msg, messageTimestampsRef)
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chats/${chatId}/completion`,
        prepareSendMessagesRequest: ({ messages: outgoingMessages }) => {
          const persistedForTransport = (persistedMessagesRef.current ?? []).map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: [{ type: "text", text: msg.content ?? "" }],
            fileIds: msg.fileIds || [],
          }));

          const persistedIds = new Set(persistedForTransport.map((m) => m.id));
          const newMessages = (outgoingMessages ?? []).filter((m) => !persistedIds.has(m.id));
          const normalized = formatMessagesForTransport([...persistedForTransport, ...newMessages]);
          const lastMessage = outgoingMessages?.[outgoingMessages.length - 1];
          const fileIds = lastMessage?.fileIds || [];

          return {
            body: {
              model: modelRef.current,
              systemPromptId: "default",
              messages: normalized,
              fileIds,
              webSearch: webSearchRef.current,
              memoryEnabled: memoryEnabledRef.current,
            },
          };
        },
      }),
    [chatId]
  );

  const {
    messages: streamingMessages,
    sendMessage,
    regenerate,
    status,
    error,
    stop,
    clearError,
  } = useAIChat({
    id: chatId,
    messages: [],
    transport,
    onFinish: async ({ message }) => {
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      const toolParts =
        message.parts?.filter((p) => p.type === "tool-invocation" && p.state === "result") || [];
      const metadata = toolParts.length > 0 ? { toolParts } : null;

      if (onMessageComplete && content.trim()) {
        await onMessageComplete({
          id: message.id,
          content,
          metadata,
          createdAt: getMessageTimestamp(message),
        });
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  const streamingMessagesWithModel = streamingMessages.map((msg) => ({
    ...ensureTimestamp(msg, messageTimestampsRef),
    model: msg.role === "assistant" ? modelRef.current : msg.model,
  }));

  const messages = isStreaming
    ? deduplicateMessages([...formattedMessages, ...streamingMessagesWithModel])
    : formattedMessages;

  async function send({ id, content, fileIds = [], createdAt }) {
    const message = {
      id: id || crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: content }],
      createdAt: createdAt ?? Date.now(),
    };
    if (fileIds.length > 0) message.fileIds = fileIds;
    messageTimestampsRef.current.set(message.id, message.createdAt);
    await sendMessage(message);
  }

  return {
    messages,
    send,
    reload: regenerate,
    stop,
    status,
    error,
    clearError,
    isStreaming,
  };
}
