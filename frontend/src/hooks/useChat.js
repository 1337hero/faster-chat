import { db } from "@/lib/db";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "preact/hooks";
import { useChatPersistence } from "./useChatPersistence";
import { useChatStream } from "./useChatStream";

export function useChat({ id: chatId, model }) {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const {
    chat,
    messages: persistedMessages,
    saveUserMessage,
    saveAssistantMessage,
  } = useChatPersistence(chatId);

  const stream = useChatStream({
    chatId,
    model,
    persistedMessages,
    onMessageComplete: async (content) => {
      if (chatId) {
        await saveAssistantMessage(content, chatId, model);
      }
    },
  });

  async function handleSubmit(e, fileIds = []) {
    e.preventDefault();

    // Support voice input passed directly (bypasses async state update issue)
    const voiceTranscript = e.voiceTranscript;
    const trimmedInput = voiceTranscript ? voiceTranscript.trim() : input.trim();

    if (!trimmedInput && fileIds.length === 0) return;

    setInput("");

    const currentChatId = chatId || (await db.createChat()).id;

    if (!chatId) {
      navigate({
        to: "/chat/$chatId",
        params: { chatId: currentChatId },
      });
    }

    try {
      await saveUserMessage(trimmedInput, currentChatId, fileIds);
      await stream.send(trimmedInput, fileIds);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  const isLoading = (chatId && !chat) || stream.isStreaming;
  const canResume = stream.status !== "streaming" && stream.status !== "submitted";

  return {
    messages: stream.messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error: stream.error,
    currentChat: chat,
    stop: stream.stop,
    resumeStream: canResume ? stream.resumeStream : undefined,
    status: stream.status,
  };
}
