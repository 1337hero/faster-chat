import { DefaultChatTransport } from "ai";
import { useChat as useAIChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef } from "preact/hooks";

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
    content: (message.parts ?? [])
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
  }));
}

export function useChatStream({ chatId, model, persistedMessages, onMessageComplete }) {
  const modelRef = useRef(model);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const formattedMessages = useMemo(
    () =>
      (persistedMessages ?? []).map((msg) => ({
        id: msg.id,
        role: msg.role,
        parts: [{ type: "text", text: msg.content }],
      })),
    [persistedMessages]
  );

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

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
    stop,
    resumeStream,
  } = useAIChat({
    id: chatId,
    messages: formattedMessages,
    transport,
    resume: true,
    onFinish: async ({ message }) => {
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      if (onMessageComplete) {
        await onMessageComplete(content);
      }
    },
  });

  const hasInitialized = useRef(false);

  useEffect(() => {
    hasInitialized.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    if (hasInitialized.current) return;
    if (persistedMessages === undefined) return;

    setMessages(formattedMessages);
    hasInitialized.current = true;
  }, [chatId, persistedMessages, formattedMessages, setMessages]);

  async function send(content) {
    await sendMessage({
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: content }],
    });
  }

  const isStreaming = status === "streaming" || status === "submitted";

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
