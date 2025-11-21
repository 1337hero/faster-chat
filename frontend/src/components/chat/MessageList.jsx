import MessageItem from "./MessageItem";

const MessageList = ({ messages, isLoading, status, onStop, onResume }) => {
  // Sort to ensure user messages come before assistant responses
  // Group into pairs and ensure proper order even if timestamps are wrong
  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = a.created_at || 0;
    const bTime = b.created_at || 0;

    // If timestamps are very close (within 5 seconds), ensure user comes first
    if (Math.abs(aTime - bTime) < 5000) {
      if (a.role === 'user' && b.role === 'assistant') return -1;
      if (a.role === 'assistant' && b.role === 'user') return 1;
    }

    return aTime - bTime;
  });

  const lastAssistantId = [...sortedMessages].reverse().find((msg) => msg.role === "assistant")?.id;

  return (
    <div className="space-y-4">
      {sortedMessages.map((message) => {
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
