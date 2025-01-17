import React from "react";
import MessageItem from "./MessageItem";

function MessageList({ messages }) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
    </div>
  );
}

export default MessageList;
