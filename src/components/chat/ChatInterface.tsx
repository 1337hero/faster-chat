"use client";

import { usePersistentChat } from "@/hooks/usePersistentChat";
import { ModelRegistry } from "@/lib/constants/models";
import React, { useLayoutEffect, useRef, useState } from "react";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";

interface ChatInterfaceProps {
  chatId?: string;
}

function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [model, setModel] = useState<keyof typeof ModelRegistry>("claude-3-5-sonnet-20241022");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    //currentChat
  } = usePersistentChat({
    id: chatId,
    model,
  });

  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    if (autoScroll) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  return (
    <div className="relative flex w-full flex-1 flex-col" role="main" aria-label="Chat Interface">
      <div className="relative flex-1 overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="scrollbar-w-2 h-[100dvh] overflow-y-auto pb-[180px] pt-16 scrollbar scrollbar-track-transparent scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
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
