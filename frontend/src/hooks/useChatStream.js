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

  const formattedMessages = (persistedMessages ?? []).map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: [{ type: "text", text: msg.content }],
  }));

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages: outgoingMessages }) => {
          const normalized = formatMessagesForTransport(outgoingMessages ?? []);
          return {
            body: {
              model: modelRef.current,
              systemPromptId: "default",
              messages: normalized,
            },
          };
        },
      }),
    []
  );

  const { messages: streamingMessages, sendMessage, status, error, stop, resumeStream } = useAIChat({
    id: chatId,
    messages: [], // Don't pass persisted messages - let Dexie handle display
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

  // Merge persisted messages from Dexie with any actively streaming message
  const messages = isStreaming
    ? deduplicateMessages([...formattedMessages, ...streamingMessages])
    : formattedMessages;

  async function send(content) {
    await sendMessage({
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: content }],
    });
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
