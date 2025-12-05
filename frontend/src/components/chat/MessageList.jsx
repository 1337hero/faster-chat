import MessageItem from "./MessageItem";
import { getMessageTimestamp } from "@/lib/messageUtils";
import { MESSAGE_CONSTANTS } from "@faster-chat/shared";

function sortMessagesWithUserFirst(messages) {
  return [...messages].sort((a, b) => {
    const aTime = getMessageTimestamp(a, 0);
    const bTime = getMessageTimestamp(b, 0);

    if (
      aTime > 0 &&
      bTime > 0 &&
      Math.abs(aTime - bTime) < MESSAGE_CONSTANTS.TIMESTAMP_SIMILARITY_MS
    ) {
      if (a.role === "user" && b.role === "assistant") return -1;
      if (a.role === "assistant" && b.role === "user") return 1;
    }

    return aTime - bTime;
  });
}

function getMessageActions(isActive, status, onStop, onRegenerate) {
  const isStreaming = status === "streaming" || status === "submitted";
  return {
    stop: isActive && isStreaming && onStop ? onStop : undefined,
    regenerate: isActive && !isStreaming && onRegenerate ? onRegenerate : undefined,
  };
}

const MessageList = ({ messages, isLoading, status, onStop, onRegenerate }) => {
  const sortedMessages = sortMessagesWithUserFirst(messages);
  const lastAssistantId = sortedMessages.findLast((msg) => msg.role === "assistant")?.id;

  return (
    <div className="space-y-4">
      {sortedMessages.map((message) => {
        const isActiveAssistant = message.id === lastAssistantId && message.role === "assistant";
        const actions = getMessageActions(isActiveAssistant, status, onStop, onRegenerate);

        return (
          <MessageItem
            key={message.id}
            message={message}
            onStop={actions.stop}
            onRegenerate={actions.regenerate}
          />
        );
      })}
      {isLoading && (
        <span className="relative flex h-3 w-3">
          <span className="bg-theme-peach absolute inline-flex h-full w-full transform-gpu animate-ping rounded-full opacity-75"></span>
          <span className="bg-theme-peach relative inline-flex h-3 w-3 rounded-full"></span>
        </span>
      )}
    </div>
  );
};

export default MessageList;
