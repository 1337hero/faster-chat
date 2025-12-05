import { extractTextContent } from "@/utils/message/messageUtils";
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
      await saveUserMessage(
        { id: messageId, content: trimmedContent, fileIds, createdAt, model },
        chatId
      );
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

  async function regenerateResponse() {
    const messages = stream.messages;
    if (!messages || messages.length === 0) return;

    const lastUserMessage = messages.findLast((msg) => msg.role === "user");
    if (!lastUserMessage) return;

    const content = extractTextContent(lastUserMessage);
    if (!content.trim()) return;

    const fileIds = lastUserMessage.fileIds || [];
    await submitMessage({ content, fileIds });
  }

  return {
    messages: stream.messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    submitMessage,
    isLoading,
    isChatError,
    error: stream.error,
    currentChat: chat,
    stop: stream.stop,
    regenerateResponse: stream.isStreaming ? undefined : regenerateResponse,
    status: stream.status,
  };
}
