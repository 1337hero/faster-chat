import MessageItem from "./MessageItem";

const MessageList = ({ messages, isLoading }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && (
        <span className="relative flex h-3 w-3">
          <span className="bg-latte-peach dark:bg-macchiato-peach absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span className="bg-latte-peach dark:bg-macchiato-peach relative inline-flex h-3 w-3 rounded-full"></span>
        </span>
      )}
    </div>
  );
};

export default MessageList;
