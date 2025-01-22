"use client";

import { usePersistentChat } from "@/hooks/usePersistentChat";
import { ModelRegistry } from "@/lib/constants/models";
import React, { useState } from "react";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";

interface ChatInterfaceProps {
  chatId?: string;
}

function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [model, setModel] = useState<keyof typeof ModelRegistry>("claude-3-5-sonnet-20241022");
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    currentChat
  } = usePersistentChat({
    id: chatId,
    model,
  });

  return (
    <div className="relative flex w-full flex-1 flex-col">     
      <div className="relative flex-1 overflow-hidden">
        <div className="scrollbar-w-2 h-[100dvh] overflow-y-auto pb-[180px] pt-16 scrollbar scrollbar-track-transparent scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
          <div className="mx-auto flex w-full max-w-3xl flex-col space-y-12 p-4">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full pr-2">
        <div className="mx-auto w-full max-w-3xl">
          <InputArea
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            disabled={isLoading}
          />
          <ModelSelector currentModel={model} onModelChange={setModel} />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;