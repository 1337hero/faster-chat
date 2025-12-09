import { MarkdownContent } from "@/components/markdown/MarkdownRenderer";
import { extractTextContent } from "@/utils/message/messageUtils";
import { memo } from "@preact/compat";
import { Brain, ChevronDown, Cpu, Sparkles } from "lucide-preact";
import MessageAttachment from "./MessageAttachment";

/**
 * Parse <think> blocks from content for reasoning models (DeepSeek R1, o1, etc.)
 * Returns { thinking: string[], content: string }
 */
const parseThinkingBlocks = (text) => {
  if (!text) return { thinking: [], content: "" };

  // Handle incomplete closing tag during streaming
  let processedText = text;
  const openCount = (text.match(/<think>/g) || []).length;
  const closeCount = (text.match(/<\/think>/g) || []).length;
  if (openCount > closeCount) {
    processedText += "</think>";
  }

  const thinking = [];
  const regex = /<think>([\s\S]*?)<\/think>/g;
  let match;
  while ((match = regex.exec(processedText)) !== null) {
    const thinkContent = match[1].trim();
    if (thinkContent) {
      thinking.push(thinkContent);
    }
  }

  // Remove think blocks from main content
  const content = processedText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  return { thinking, content };
};

const MessageItem = memo(({ message, onStop, onRegenerate }) => {
  const isUser = message.role === "user";
  const rawContent = extractTextContent(message);
  const { thinking, content } = isUser
    ? { thinking: [], content: rawContent }
    : parseThinkingBlocks(rawContent);
  const isStreaming = message.experimental_status === "streaming";
  const showActions = !isUser && (onStop || onRegenerate);
  const hasAttachments = message.fileIds && message.fileIds.length > 0;
  const modelName = message.model;
  const hasThinking = thinking.length > 0;

  return (
    <div className={`mb-8 flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[85%] gap-4 md:max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10 ${
            isUser
              ? "bg-theme-surface-strong text-theme-text"
              : "from-theme-mauve to-theme-blue bg-gradient-to-br text-white"
          } `}
          style={{ boxShadow: "var(--shadow-depth-md)" }}>
          {isUser ? (
            <div className="text-xs font-bold">ME</div>
          ) : (
            <Cpu className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </div>

        <div
          className={`relative overflow-hidden p-5 text-sm leading-relaxed transition-all duration-300 ease-in-out md:text-base ${
            isUser
              ? "bg-theme-surface-stronger rounded-tl-lg rounded-br-lg rounded-bl-lg bg-gradient-to-br text-white"
              : "text-theme-text"
          } `}
          style={{ boxShadow: "var(--shadow-depth-sm)" }}>
          {!isUser && (
            <div className="from-theme-blue via-theme-mauve absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r to-transparent opacity-70" />
          )}

          {!isUser && modelName && (
            <div className="mb-2 flex items-center gap-1.5">
              <Cpu className="text-theme-mauve h-3 w-3" />
              <span className="text-theme-text-muted text-xs font-medium">{modelName}</span>
            </div>
          )}

          {hasAttachments && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.fileIds.map((fileId) => (
                <MessageAttachment key={fileId} fileId={fileId} />
              ))}
            </div>
          )}

          {hasThinking && (
            <div className="mb-4">
              {thinking.map((thinkContent, index) => (
                <details
                  key={index}
                  className="bg-theme-surface/50 border-theme-border/50 group rounded-lg border">
                  <summary className="text-theme-text-muted hover:text-theme-text flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium transition-colors select-none">
                    <Brain className="text-theme-mauve h-4 w-4 flex-shrink-0" />
                    <span>Reasoning</span>
                    <ChevronDown className="ml-auto h-4 w-4 transform-gpu transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="text-theme-text-muted border-theme-border/50 border-t px-3 py-3 text-sm">
                    <MarkdownContent content={thinkContent} />
                  </div>
                </details>
              ))}
            </div>
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
                  className="border-theme-border text-theme-red bg-theme-surface rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-150 hover:brightness-110">
                  Stop
                </button>
              )}
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="border-theme-border text-theme-peach bg-theme-surface rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-150 hover:brightness-110">
                  Regenerate
                </button>
              )}
            </div>
          )}

          {isStreaming && (
            <div className="text-theme-mauve mt-3 flex transform-gpu animate-pulse items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageItem;
