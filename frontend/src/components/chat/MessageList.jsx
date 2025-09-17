import MessageItem from './MessageItem';

function MessageList({ messages, isLoading }) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && (
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-latte-peach dark:bg-macchiato-peach opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-latte-peach dark:bg-macchiato-peach"></span>
        </span>
      )}
    </div>
  );
}

export default MessageList;
