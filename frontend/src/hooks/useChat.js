import { chatsClient } from "@/lib/chatsClient";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "preact/hooks";
import { useChatPersistence } from "./useChatPersistence";
import { useChatStream } from "./useChatStream";

export function useChat({ id: chatId, model }) {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const {
    chat,
    messages: persistedMessages,
    isChatLoading,
    isChatError,
    saveUserMessage,
    saveAssistantMessage,
  } = useChatPersistence(chatId);

  // Redirect to new chat if current chat is not found/deleted
  useEffect(() => {
    if (chatId && isChatError) {
      chatsClient
        .createChat()
        .then((newChat) => {
          navigate({
            to: "/chat/$chatId",
            params: { chatId: newChat.id },
            replace: true,
          });
        })
        .catch((err) => {
          console.error("Failed to create new chat after error:", err);
        });
    }
  }, [chatId, isChatError, navigate]);

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

    let currentChatId = chatId;
    if (!currentChatId) {
      const newChat = await chatsClient.createChat();
      currentChatId = newChat.id;
    }

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

  const isLoading = (chatId && isChatLoading) || stream.isStreaming;
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
