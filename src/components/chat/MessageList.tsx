import React from "react";
import { Message } from "./ChatInterface";
import MessageItem from "./MessageItem";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      {isLoading && (
        <div className="animate-pulse bg-gray-100 rounded-lg p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      )}
    </div>
  );
}

export default MessageList;