import { MarkdownContent } from "@/components/markdown/markdown-chunker";
import { Message } from "ai";
import { memo } from "react";

const MessageItem = memo(function MessageItem({ message }: { message: Message }) {
  const containerClassName =
    message.role === "user"
      ? "bg-macchiato-surface1 text-macchiato-text px-4 py-2 rounded-lg"
      : "bg-transparent text-macchiato-text";

  return (
    <div className={containerClassName}>
      <MarkdownContent content={message.content} />
    </div>
  );
});

export default MessageItem;
