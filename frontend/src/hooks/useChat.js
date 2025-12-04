import { useState } from "preact/hooks";
import { useChatPersistence } from "./useChatPersistence";
import { useChatStream } from "./useChatStream";

export function useChat({ id: chatId, model }) {
  const [input, setInput] = useState("");

  const {
    chat,
    messages: persistedMessages,
    isChatLoading,
    isChatError,
    saveUserMessage,
    saveAssistantMessage,
  } = useChatPersistence(chatId);

  const stream = useChatStream({
    chatId,
    model,
    persistedMessages,
    onMessageComplete: async ({ id, content, createdAt }) => {
      if (chatId) {
        await saveAssistantMessage({ id, content, model, createdAt }, chatId);
      }
    },
  });

  // Imperative API for submitting messages (used by voice and form)
  async function submitMessage({ content, fileIds = [] }) {
    const trimmedContent = content.trim();
    if (!trimmedContent && fileIds.length === 0) return;
    if (!chatId) return; // Route should ensure chatId exists

    const messageId = crypto.randomUUID();
    const createdAt = Date.now();
    setInput("");

    try {
      await saveUserMessage({ id: messageId, content: trimmedContent, fileIds, createdAt }, chatId);
      await stream.send({ id: messageId, content: trimmedContent, fileIds, createdAt });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  }

  // Form handler wraps imperative API
  function handleSubmit(e, fileIds = []) {
    e.preventDefault();
    submitMessage({ content: input, fileIds });
  }

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  const isLoading = (chatId && isChatLoading) || stream.isStreaming;
  const canResume = stream.status !== "streaming" && stream.status !== "submitted";

  return {
    messages: stream.messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    submitMessage, // Imperative API for voice input
    isLoading,
    isChatError, // Expose for route-level error handling
    error: stream.error,
    currentChat: chat,
    stop: stream.stop,
    resumeStream: canResume ? stream.resumeStream : undefined,
    status: stream.status,
  };
}
