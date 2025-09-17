import { MarkdownContent } from '@/components/markdown/markdown-chunker';
import { memo } from '@preact/compat';

function extractTextContent(message) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

const MessageItem = memo(function MessageItem({ message }) {
  const containerClassName =
    message.role === "user"
      ? "bg-latte-surface1 dark:bg-macchiato-surface1 text-latte-text dark:text-macchiato-text px-4 py-2 rounded-lg shadow-sm"
      : "bg-transparent text-latte-text dark:text-macchiato-text";

  const content = extractTextContent(message);

  return (
    <div className={containerClassName}>
      <MarkdownContent content={content} />
    </div>
  );
});

export default MessageItem;
