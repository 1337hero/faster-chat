import { MarkdownContent } from "@/components/markdown/markdown-chunker";
import { memo } from "@preact/compat";
import { Cpu, Sparkles } from "lucide-react";
import MessageAttachment from "./MessageAttachment";

const extractTextContent = (message) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

const MessageItem = memo(({ message, onStop, onResume }) => {
  const isUser = message.role === "user";
  const content = extractTextContent(message);
  const isStreaming = message.experimental_status === "streaming";
  const showActions = !isUser && (onStop || onResume);
  const hasAttachments = message.fileIds && message.fileIds.length > 0;
  const modelName = message.model || null;

  return (
    // MESSAGE ROW: Controls alignment (user messages right, AI messages left)
    <div className={`mb-8 flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {/* MESSAGE CONTAINER: Contains avatar + bubble, controls flex direction */}
      <div
        className={`flex max-w-[85%] gap-4 md:max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* AVATAR SECTION */}
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10 ${
            isUser
              ? "bg-latte-surface1 dark:bg-macchiato-surface1 text-latte-text dark:text-macchiato-text" // USER AVATAR: neutral background
              : "from-latte-mauve to-latte-blue dark:from-macchiato-mauve dark:to-macchiato-blue bg-gradient-to-br text-white" // AI AVATAR: gradient background
          } `}
          style={{ boxShadow: "var(--shadow-depth-md)" }}>
          {isUser ? (
            <div className="text-xs font-bold">ME</div>
          ) : (
            <Cpu className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </div>

        {/* MESSAGE BUBBLE: Main content container */}
        <div
          className={`relative overflow-hidden p-5 text-sm leading-relaxed transition-all duration-300 ease-in-out md:text-base ${
            isUser
              ? "bg-latte-surface2 dark:bg-macchiato-crust rounded-bl-lg rounded-br-lg rounded-tl-lg bg-gradient-to-br text-white" // USER BUBBLE: blue gradient, right corner cut
              : "text-latte-text dark:text-macchiato-text" // AI BUBBLE: solid background with border, left corner cut
          } `}
          style={{ boxShadow: "var(--shadow-depth-sm)" }}>
          {/* AI ACCENT: Gradient lines on top and bottom (only show on AI messages) */}
          {!isUser && (
            <>
              <div className="from-latte-blue via-latte-mauve dark:from-macchiato-blue dark:via-macchiato-mauve absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r to-transparent opacity-70" />
            </>
          )}

          {/* MODEL NAME (only shows on AI messages with model info) */}
          {!isUser && modelName && (
            <div className="mb-2 flex items-center gap-1.5">
              <Cpu className="text-latte-mauve dark:text-macchiato-mauve h-3 w-3" />
              <span className="text-latte-subtext0 dark:text-macchiato-subtext0 text-xs font-medium">
                {modelName}
              </span>
            </div>
          )}

          {/* FILE ATTACHMENTS (when present) */}
          {hasAttachments && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.fileIds.map((fileId) => (
                <MessageAttachment key={fileId} fileId={fileId} />
              ))}
            </div>
          )}

          {/* MESSAGE TEXT CONTENT */}
          <div className={`font-sans ${isUser ? "font-medium text-white/95" : ""}`}>
            <MarkdownContent content={content} />
          </div>

          {/* ACTION BUTTONS (Stop/Continue - only on AI messages) */}
          {showActions && (
            <div className="mt-4 flex justify-end gap-2">
              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="elevate-sm border-latte-surface2/60 dark:border-macchiato-surface2/60 text-latte-red dark:text-macchiato-red hover:text-latte-red dark:hover:text-macchiato-red bg-latte-surface1/80 dark:bg-macchiato-surface1/80 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 hover:brightness-110">
                  Stop
                </button>
              )}
              {onResume && (
                <button
                  type="button"
                  onClick={onResume}
                  className="elevate-sm border-latte-surface2/60 dark:border-macchiato-surface2/60 text-latte-blue dark:text-macchiato-blue hover:text-latte-blue dark:hover:text-macchiato-blue bg-latte-surface1/80 dark:bg-macchiato-surface1/80 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 hover:brightness-110">
                  Continue
                </button>
              )}
            </div>
          )}

          {/* STREAMING INDICATOR (only shows while AI is typing) */}
          {isStreaming && (
            <div className="text-latte-mauve dark:text-macchiato-mauve mt-3 flex animate-pulse items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
        </div>
        {/* END MESSAGE BUBBLE */}
      </div>
      {/* END MESSAGE CONTAINER */}
    </div>
    // END MESSAGE ROW
  );
});

export default MessageItem;
