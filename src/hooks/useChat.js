import { useCallback, useEffect, useRef, useState } from 'react';
import { createProvider, ModelRegistry, ProviderType } from '../services/providers/provider-registry';
import { chatStorage } from '../services/storage/chat-storage';

export const MessageRoles = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

export const CONTEXT_WINDOW_SIZE = 4;

export const useChatState = (conversationId = null) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [activeProvider, setActiveProvider] = useState(ProviderType.ANTHROPIC);
  const [activeModel, setActiveModel] = useState('claude-3-sonnet-20240229');
  const streamingMessageRef = useRef('');
  const startTime = performance.now();

    // Handle streaming updates
    const handleStreamingUpdate = useCallback((chunk) => {
      streamingMessageRef.current += chunk;
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.role === MessageRoles.ASSISTANT) {
          newMessages[newMessages.length - 1].content = streamingMessageRef.current;
        } else {
          newMessages.push({
            role: MessageRoles.ASSISTANT,
            content: streamingMessageRef.current
          });
        }
        return newMessages;
      });
    }, []);

  // Initialize provider and load conversation
  useEffect(() => {
    const initChat = async () => {
      // Create provider instance
      const providerInstance = createProvider(activeProvider);
      setProvider(providerInstance);

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

  const getOptimizedMessages = useCallback((messages) => {
    const relevantMessages = messages.slice(-CONTEXT_WINDOW_SIZE);
    
    const uniqueMessages = relevantMessages.filter((msg, index, self) =>
      index === self.findIndex((m) => m.content === msg.content)
    );

    return uniqueMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }, []);

  const sendMessage = useCallback(async (content) => {
    if (!provider) return;
    setIsLoading(true);
    setError(null);
    streamingMessageRef.current = ''; // Reset streaming message

    // Create user message
    const userMessage = {
      role: MessageRoles.USER,
      content: content.trim()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const optimizedMessages = getOptimizedMessages(updatedMessages);
      
      const response = await provider.sendMessage(optimizedMessages, {
        model: activeModel
      });
    
      if (!response.success) {
        throw new Error(response.error);
      }
    
      // Handle streaming response
      for await (const chunk of response.stream) {
        // Debug log to see chunk structure
        console.log('Received chunk:', chunk);
        const text = chunk.delta?.text || chunk.text || '';
        handleStreamingUpdate(text);
      }
    
      // Save to storage after stream completes
      if (conversationId) {
        await chatStorage.updateConversation(conversationId, {
          messages: [...updatedMessages, {
            role: MessageRoles.ASSISTANT,
            content: streamingMessageRef.current
          }],
          lastUpdated: new Date().getTime()
        });
      }
    
      return {
        role: MessageRoles.ASSISTANT,
        content: streamingMessageRef.current
      };
    } catch (err) {
      console.error('Streaming error:', err);
      setError(err.message);
      return null;
    } finally {
      const duration = performance.now() - startTime;
      console.debug(`Request completed in ${duration}ms`);
      setIsLoading(false);
    }
  }, [messages, provider, conversationId, activeModel, handleStreamingUpdate, getOptimizedMessages]);

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