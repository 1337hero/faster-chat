import type { Message } from 'ai';
import { useChat } from 'ai/react';

export const ModelRegistry = {
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
  },
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet',
    contextWindow: 200000,
  },
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    contextWindow: 200000,
  }
} as const;

export type ModelId = keyof typeof ModelRegistry;

interface UseChatOptions {
  initialMessages?: Message[];
  id?: string;
}

export function useChatState(options: UseChatOptions = {}) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages
  } = useChat({
    api: '/api/chat',
    id: options.id,
    initialMessages: options.initialMessages,
  });

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    clearChat: () => setMessages([])
  };
}