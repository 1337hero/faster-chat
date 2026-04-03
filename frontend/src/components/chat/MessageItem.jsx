import { MarkdownContent } from "@/components/markdown/MarkdownRenderer";
import { extractTextContent } from "@/lib/messageUtils";
import { memo } from "@preact/compat";
import { AlertTriangle, Brain, ChevronDown, Sparkles } from "lucide-preact";
import MessageAttachment from "./MessageAttachment";
import ModelAvatar from "./ModelAvatar";
import SearchStatus from "./SearchStatus";
import SourceCitations, { extractSources, TOOL_ERROR_MESSAGES } from "./SourceCitations";

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
  const activeToolCall = message.parts?.find(
    (p) => p.type === "tool-invocation" && p.state === "call"
  );
  const sources = isUser ? [] : extractSources(message.parts);
  const toolErrors = isUser
    ? []
    : message.parts?.filter(
        (p) => p.type === "tool-invocation" && p.state === "result" && p.result?.error
      ) || [];

  return (
    <div className={`mb-8 flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[85%] gap-4 md:max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {!isUser && <ModelAvatar modelId={modelName} />}

        <div
          className={`relative overflow-hidden p-5 text-sm leading-relaxed transition-all duration-300 ease-in-out md:text-base ${
            isUser
              ? "bg-theme-surface-stronger rounded-tl-lg rounded-br-lg rounded-bl-lg bg-gradient-to-br pt-5 text-white"
              : "text-theme-text pt-0"
          } `}
          style={{ boxShadow: "var(--shadow-depth-sm)" }}>
          {!isUser && modelName && (
            <div className="mb-4">
              <span className="text-theme-text text-lg font-bold">{modelName}</span>
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

          {toolErrors.length > 0 && (
            <div className="mb-3 space-y-2">
              {toolErrors.map((err, i) => (
                <div
                  key={i}
                  role="alert"
                  className="bg-theme-red/8 border-theme-red/20 text-theme-red flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{TOOL_ERROR_MESSAGES[err.result.code] || err.result.error}</span>
                </div>
              ))}
            </div>
          )}

          <div className={`font-sans ${isUser ? "font-medium text-white/95" : ""}`}>
            <MarkdownContent content={content} />
          </div>

          {sources.length > 0 && <SourceCitations sources={sources} />}

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

          {isStreaming && !activeToolCall && (
            <div className="text-theme-mauve mt-3 flex transform-gpu animate-pulse items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
          {activeToolCall && (
            <SearchStatus toolName={activeToolCall.toolName} args={activeToolCall.args} />
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageItem;
