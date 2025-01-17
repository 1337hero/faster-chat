import React from "react";
import { useChatState } from "../hooks/useChat";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";

function ChatInterface() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    model,
    setModel
  } = useChatState();

  const handleSendMessage = async (message) => {
    await sendMessage(message);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col space-y-4">
        <ModelSelector 
          currentModel={model} 
          onModelChange={setModel} 
        />
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <MessageList messages={messages} isLoading={isLoading} />
        <InputArea onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}

export default ChatInterface;