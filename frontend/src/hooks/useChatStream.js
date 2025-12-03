import { DefaultChatTransport } from "ai";
import { useChat as useAIChat } from "@ai-sdk/react";
import { useMemo, useRef } from "preact/hooks";

const MAX_MESSAGE_HISTORY = 64;

function trimMessageHistory(messages) {
  const trimmed = messages.slice(-MAX_MESSAGE_HISTORY);
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

function deduplicateMessages(messages) {
  const seen = new Set();
  return messages.filter((msg) => {
    const content = msg.parts?.map((p) => p.text).join("") || "";
    const key = `${msg.role}:${content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useChatStream({ chatId, model, persistedMessages, onMessageComplete }) {
  const modelRef = useRef(model);
  modelRef.current = model;

  const persistedMessagesRef = useRef(persistedMessages);
  persistedMessagesRef.current = persistedMessages;

  const formattedMessages = (persistedMessages ?? []).map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: [{ type: "text", text: msg.content }],
    fileIds: msg.fileIds || [],
    model: msg.model || null,
  }));

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
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
    []
  );

  const {
    messages: streamingMessages,
    sendMessage,
    status,
    error,
    stop,
    resumeStream,
  } = useAIChat({
    id: chatId,
    messages: [], // SDK state starts empty; persisted messages are merged in prepareSendMessagesRequest
    transport,
    resume: true,
    onFinish: async ({ message }) => {
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      if (onMessageComplete && content.trim()) {
        await onMessageComplete(content);
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Attach current model to streaming assistant messages
  const streamingMessagesWithModel = streamingMessages.map((msg) => ({
    ...msg,
    model: msg.role === "assistant" ? modelRef.current : msg.model,
  }));

  // Merge persisted messages from server with any actively streaming message
  const messages = isStreaming
    ? deduplicateMessages([...formattedMessages, ...streamingMessagesWithModel])
    : formattedMessages;

  async function send(content, fileIds = []) {
    const message = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: content }],
    };

    // Attach fileIds to message if provided
    if (fileIds.length > 0) {
      message.fileIds = fileIds;
    }

    await sendMessage(message);
  }

  return {
    messages,
    send,
    stop,
    resumeStream,
    status,
    error,
    isStreaming,
  };
}
