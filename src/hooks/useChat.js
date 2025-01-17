import { useCallback, useEffect, useState } from 'react';
import { createProvider, ModelRegistry, ProviderType } from '../services/providers/provider-registry';
import { chatStorage } from '../services/storage/chat-storage';

export const MessageRoles = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

// We'll use React's useState for global state instead of signals
export const useChatState = (conversationId = null) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [activeProvider, setActiveProvider] = useState(ProviderType.ANTHROPIC);
  const [activeModel, setActiveModel] = useState('claude-3-sonnet-20240229');

  // Initialize provider and load conversation if ID provided
  useEffect(() => {
    const initChat = async () => {
      // Create provider instance
      const providerInstance = createProvider(activeProvider);
      setProvider(providerInstance);

      // Load conversation if ID provided
      if (conversationId) {
        try {
          const conversation = await chatStorage.getConversation(conversationId);
          if (conversation) {
            setMessages(conversation.messages);
          }
        } catch (err) {
          console.error('Error loading conversation:', err);
          setError('Failed to load conversation history');
        }
      }
    };

    initChat();
  }, [conversationId, activeProvider]);

  // Handle provider/model changes
  useEffect(() => {
    if (activeProvider) {
      setProvider(createProvider(activeProvider));
    }
  }, [activeProvider]);

  const sendMessage = useCallback(async (content) => {
    if (!provider) return;

    setIsLoading(true);
    setError(null);

    // Create user message
    const userMessage = provider.formatMessage(MessageRoles.USER, content);
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Send to API
      const response = await provider.sendMessage(updatedMessages, {
        model: activeModel
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Add assistant's response
      const assistantMessage = provider.formatMessage(
        MessageRoles.ASSISTANT,
        response.data.content[0].text
      );
      
      const newMessages = [...updatedMessages, assistantMessage];
      setMessages(newMessages);

      // Save to storage
      if (conversationId) {
        await chatStorage.updateConversation(conversationId, {
          messages: newMessages,
          lastUpdated: new Date().getTime()
        });
      } else {
        await chatStorage.saveConversation({
          messages: newMessages,
          provider: activeProvider,
          model: activeModel
        });
      }

      return assistantMessage;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [messages, provider, conversationId, activeModel]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    setError(null);
    
    if (conversationId) {
      try {
        await chatStorage.deleteConversation(conversationId);
      } catch (err) {
        console.error('Error deleting conversation:', err);
      }
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    provider: activeProvider,
    model: activeModel,
    setProvider: setActiveProvider,
    setModel: setActiveModel
  };
};

// Export for convenience
export const availableModels = ModelRegistry;