import { db } from '@/lib/db';
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "preact/hooks";
import { useChatPersistence } from './useChatPersistence';
import { useChatStream } from './useChatStream';

export function useChat({ id: initialChatId, model }) {
  const [chatId, setChatId] = useState(initialChatId);
  const [input, setInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState(null);
  const navigate = useNavigate();

  const { chat, messages: persistedMessages, saveUserMessage, saveAssistantMessage } =
    useChatPersistence(chatId);

  const stream = useChatStream({
    chatId,
    model,
    persistedMessages,
    onMessageComplete: async (content) => {
      if (chatId) {
        await saveAssistantMessage(content, chatId);
      }
    },
  });

  async function sendUserMessage(content, currentChatId) {
    try {
      await stream.send(content);
      await saveUserMessage(content, currentChatId);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setInput("");

    let currentChatId = chatId;

    if (!currentChatId) {
      const newChat = await db.createChat();
      currentChatId = newChat.id;
      setChatId(currentChatId);
      navigate({
        to: "/chat/$chatId",
        params: { chatId: currentChatId },
      });

      setPendingMessage(trimmedInput);
      return;
    }

    await sendUserMessage(trimmedInput, currentChatId);
  }

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  useEffect(() => {
    setChatId(initialChatId);
  }, [initialChatId]);

  useEffect(() => {
    if (!chatId || !pendingMessage) return;

    sendUserMessage(pendingMessage, chatId).finally(() => {
      setPendingMessage(null);
    });
  }, [chatId, pendingMessage]);

  const isLoading = (chatId && !chat) || stream.isStreaming;
  const canResume = stream.status !== "streaming" && stream.status !== "submitted";

  return {
    messages: stream.messages,
    input,
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
