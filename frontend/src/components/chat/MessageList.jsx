import MessageItem from "./MessageItem";
import { getMessageTimestamp } from "@/lib/messageUtils";
import { MESSAGE_CONSTANTS } from "@faster-chat/shared";
import { ImageIcon } from "lucide-react";

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

const ImageGeneratingSkeleton = () => (
  <div className="flex gap-3">
    <div className="bg-theme-pink/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
      <ImageIcon className="text-theme-pink h-4 w-4" />
    </div>
    <div className="flex-1">
      <div className="bg-theme-surface-strong mb-2 h-4 w-32 animate-pulse rounded" />
      <div className="border-theme-surface-strong bg-theme-surface relative aspect-square w-64 overflow-hidden rounded-xl border">
        <div className="bg-theme-surface-strong/50 absolute inset-0 animate-pulse" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <div className="bg-theme-pink/20 h-12 w-12 animate-pulse rounded-full" />
            <ImageIcon className="text-theme-pink/50 absolute inset-0 m-auto h-6 w-6" />
          </div>
          <div className="text-theme-text-muted text-sm">Generating image...</div>
          <div className="flex gap-1">
            <span className="bg-theme-pink h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-theme-pink h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-theme-pink h-1.5 w-1.5 animate-bounce rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MessageList = ({ messages, isLoading, isGeneratingImage, status, onStop, onRegenerate }) => {
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
      {isGeneratingImage && <ImageGeneratingSkeleton />}
    </div>
  );
};

export default MessageList;
