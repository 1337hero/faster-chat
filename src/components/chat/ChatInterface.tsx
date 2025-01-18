'use client';

import { ModelRegistry } from '@/lib/constants/models';
import { useChatState } from "@/lib/hooks/useChat";
import React, { useState } from "react";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";


function ChatInterface() {
  const [model, setModel] = useState<keyof typeof ModelRegistry>('claude-3-sonnet-20240229');

  // Pass the model to useChatState
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    clearChat,
  } = useChatState({ model });

  const handleModelChange = (newModel: keyof typeof ModelRegistry) => {
    setModel(newModel);
    clearChat(); // Optional: clear chat when model changes
  };

  return (
    <>
      <ModelSelector
        currentModel={model}
        onModelChange={handleModelChange}
      />
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{error.message}</span>
        </div>
      )}
      <MessageList messages={messages} isLoading={isLoading} />
      <InputArea
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        disabled={isLoading}
      />
    </>
  );
}

export default ChatInterface;
