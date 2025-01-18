import { ModelId } from '@/lib/constants/models';
import type { Message } from 'ai';
import { useChat } from 'ai/react';

export interface UseChatOptions {
  initialMessages?: Message[];
  id?: string;
  model: ModelId; // Make model required
}

export function useChatState({ initialMessages, id, model }: UseChatOptions) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: '/api/chat',
    id,
    initialMessages,
    body: { model },
  });

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    clearChat: () => setMessages([]),
  };
}
