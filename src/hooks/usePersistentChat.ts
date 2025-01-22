import { Chat, db, StoredMessage } from '@/lib/db';
import { ModelId } from '@/types/models';
import { useChat } from 'ai/react';
import { useCallback, useEffect, useState } from 'react';

export interface UsePersistentChatOptions {
  id?: string;
  model: ModelId;
}

export function usePersistentChat({ id: chatId, model }: UsePersistentChatOptions) {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    setMessages,
  } = useChat({
    api: '/api/chat',
    id: chatId,
    body: { model },
    onFinish: async (message) => {
      if (currentChat && message.role === 'assistant') {
        await db.addMessage({
          chatId: currentChat.id,
          content: message.content,
          role: message.role,
        });
      }
    }
  });

  // Load initial messages for chat
  useEffect(() => {
    async function loadChat() {
      if (!chatId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const chat = await db.chats.get(chatId);
        if (chat) {
          setCurrentChat(chat);
          const storedMessages = await db.getChatMessages(chatId);
          setMessages(storedMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
          })));
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        setError(error instanceof Error ? error : new Error('Failed to load chat'));
      } finally {
        setIsLoading(false);
      }
    }

    loadChat();
  }, [chatId, setMessages]);

  // Handle message persistence
  const persistMessage = useCallback(async (content: string, role: 'user' | 'assistant', chatId: string) => {
    try {
      const message = await db.addMessage({
        chatId,
        content,
        role,
      });
      return message;
    } catch (error) {
      console.error(`Error persisting ${role} message:`, error);
      throw error;
    }
  }, []);

  // Enhanced submit handler with persistence
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      if (!input.trim()) return;

      try {
        setError(null);
        let chatToUse = currentChat;

        // Create new chat if needed
        if (!chatToUse) {
          chatToUse = await db.createChat();
          setCurrentChat(chatToUse);
        }

        // Store user message
        const userMessage = await persistMessage(input, 'user', chatToUse.id);
        
        // Update UI with user message immediately
        setMessages(prev => [...prev, {
          id: userMessage.id,
          content: userMessage.content,
          role: userMessage.role,
        }]);

        // Get AI response
        await originalHandleSubmit(e);

        // Store AI message after response
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          await persistMessage(lastMessage.content, 'assistant', chatToUse.id);
        }

        // Update chat title if it's the first message
        if (!chatToUse.title) {
          const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
          await db.updateChatTitle(chatToUse.id, title);
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        setError(error instanceof Error ? error : new Error('Failed to process message'));
      }
    },
    [currentChat, input, messages, originalHandleSubmit, persistMessage, setMessages]
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    currentChat,
  };
}