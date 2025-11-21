import MessageItem from "./MessageItem";

const MessageList = ({ messages, isLoading, status, onStop, onResume }) => {
  const lastAssistantId = [...messages].reverse().find((msg) => msg.role === "assistant")?.id;

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isActiveAssistant = message.id === lastAssistantId && message.role === "assistant";
        const showStopAction =
          isActiveAssistant && (status === "streaming" || status === "submitted") && Boolean(onStop);
        const showResumeAction =
          isActiveAssistant &&
          status !== "streaming" &&
          status !== "submitted" &&
          Boolean(onResume);

        return (
          <MessageItem
            key={message.id}
            message={message}
            onStop={showStopAction ? onStop : undefined}
            onResume={showResumeAction ? onResume : undefined}
          />
        );
      })}
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
