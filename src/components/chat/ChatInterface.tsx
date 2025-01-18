"use client";

import { useChatState } from "@/hooks/useChat";
import { ModelRegistry } from "@/lib/constants/models";
import React, { useState } from "react";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";

function ChatInterface() {
  const [model, setModel] = useState<keyof typeof ModelRegistry>("claude-3-sonnet-20240229");

  // Pass the model to useChatState
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    //error,
    clearChat,
  } = useChatState({ model });

  const handleModelChange = (newModel: keyof typeof ModelRegistry) => {
    setModel(newModel);
    clearChat(); // Optional: clear chat when model changes
  };

  return (
    <div className="relative">
      <ModelSelector currentModel={model} onModelChange={handleModelChange} />
      <MessageList messages={messages} isLoading={isLoading} />
      <InputArea
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}

export default ChatInterface;
