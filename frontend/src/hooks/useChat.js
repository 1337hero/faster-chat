import { extractTextContent } from "@/lib/messageUtils";
import { useEffect, useState } from "preact/hooks";
import { useChatPersistence } from "./useChatPersistence";
import { useChatStream } from "./useChatStream";

export function useChat({ id: chatId, model, webSearchEnabled, memoryEnabled }) {
  const [input, setInput] = useState("");
  const [inputFiles, setInputFiles] = useState([]);

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
    webSearchEnabled,
    memoryEnabled,
    persistedMessages,
    onMessageComplete: async ({ id, content, metadata, createdAt }) => {
      if (chatId) {
        await saveAssistantMessage({ id, content, model, metadata, createdAt }, chatId);
      }
    },
  });

  // Clear error when model changes
  const modelRef = useRef(model);
  useEffect(() => {
    if (modelRef.current !== model) {
      modelRef.current = model;
      stream.clearError?.();
    }
  }, [model]);

  async function submitMessage({ content, fileIds = [] }) {
    const trimmedContent = content.trim();
    if (!trimmedContent && fileIds.length === 0) return;
    if (!chatId) return;

    const messageId = crypto.randomUUID();
    const createdAt = Date.now();
    setInput("");
    stream.clearError();

    try {
      await saveUserMessage(
        { id: messageId, content: trimmedContent, fileIds, createdAt, model },
        chatId
      );
      await stream.send({ id: messageId, content: trimmedContent, fileIds, createdAt });
      setInputFiles([]);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  }

  function handleSubmit(e, fileIds = []) {
    e.preventDefault();
    submitMessage({ content: input, fileIds });
  }

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  const isLoading = (chatId && isChatLoading) || stream.isStreaming;

  async function regenerateResponse() {
    stream.reload();
  }

  const appendFiles = (files) => setInputFiles((prev) => [...prev, ...files]);
  const removeFile = (fileId) => setInputFiles((prev) => prev.filter((f) => f.id !== fileId));

  return {
    messages: stream.messages,
    input,
    setInput,
    inputFiles,
    appendFiles,
    removeFile,
    handleInputChange,
    handleSubmit,
    submitMessage,
    isLoading,
    isChatError,
    error: stream.error,
    clearError: stream.clearError,
    currentChat: chat,
    stop: stream.stop,
    regenerateResponse: stream.isStreaming ? undefined : regenerateResponse,
    status: stream.status,
  };
}
