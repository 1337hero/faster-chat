import { MarkdownContent } from "@/components/markdown/markdown-chunker";
import { memo } from "@preact/compat";

const CpuIcon = ({ className, size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
};

const SparklesIcon = ({ className, size = 18 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
};

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

  return (
    <div className={`mb-8 flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[85%] gap-4 md:max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10 ${
            isUser
              ? "bg-latte-surface1 dark:bg-macchiato-surface1 text-latte-text dark:text-macchiato-text"
              : "from-latte-mauve to-latte-blue dark:from-macchiato-mauve dark:to-macchiato-blue bg-gradient-to-br text-white"
          } `}
          style={{ boxShadow: "var(--shadow-depth-md)" }}>
          {isUser ? (
            <div className="text-xs font-bold">ME</div>
          ) : (
            <CpuIcon className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative overflow-hidden rounded-2xl p-5 text-sm leading-relaxed transition-all duration-300 ease-in-out md:text-base ${
            isUser
              ? "from-latte-blue to-latte-sky dark:from-macchiato-blue dark:to-macchiato-sky rounded-tr-sm bg-gradient-to-br text-white"
              : "bg-latte-surface0 dark:bg-macchiato-surface0 text-latte-text dark:text-macchiato-text border-latte-surface1/30 dark:border-macchiato-surface1/30 rounded-tl-sm border"
          } `}
          style={{ boxShadow: "var(--shadow-depth-sm)" }}>
          {/* Shiny effect for AI messages */}
          {!isUser && (
            <div className="from-latte-blue via-latte-mauve dark:from-macchiato-blue dark:via-macchiato-mauve absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r to-transparent opacity-70" />
          )}

          <div className={`font-sans ${isUser ? "font-medium text-white/95" : ""}`}>
            <MarkdownContent content={content} />
          </div>

          {showActions && (
            <div className="mt-4 flex justify-end gap-2">
              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="elevate-sm border-latte-surface2/60 dark:border-macchiato-surface2/60 text-latte-red dark:text-macchiato-red hover:text-latte-red hover:brightness-110 dark:hover:text-macchiato-red rounded-full border bg-latte-surface1/80 px-3 py-1 text-xs font-semibold transition-all duration-150 dark:bg-macchiato-surface1/80">
                  Stop
                </button>
              )}
              {onResume && (
                <button
                  type="button"
                  onClick={onResume}
                  className="elevate-sm border-latte-surface2/60 dark:border-macchiato-surface2/60 text-latte-blue dark:text-macchiato-blue hover:text-latte-blue hover:brightness-110 dark:hover:text-macchiato-blue rounded-full border bg-latte-surface1/80 px-3 py-1 text-xs font-semibold transition-all duration-150 dark:bg-macchiato-surface1/80">
                  Continue
                </button>
              )}
            </div>
          )}

          {isStreaming && (
            <div className="text-latte-mauve dark:text-macchiato-mauve mt-3 flex animate-pulse items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageItem;
