import { memo, useState, useEffect } from "@preact/compat";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Copy, Check, ExternalLink } from "lucide-react";
import { highlightCode } from "@/lib/shiki";
import { UI_CONSTANTS } from "@faster-chat/shared";
import "katex/dist/katex.min.css";

// Static plugin arrays - never recreated
const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

/**
 * Code block with Shiki syntax highlighting.
 * Supports dual themes via CSS variables (responds to .dark class).
 */
const CodeBlock = ({ inline, className, children }) => {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState(null);

  const lang = className?.match(/language-(\w+)/)?.[1] ?? "";
  const code = String(children).trim();

  // Inline code - no highlighting needed
  if (inline) {
    return (
      <code className="bg-theme-surface-strong rounded px-1.5 py-0.5 text-sm font-medium">
        {children}
      </code>
    );
  }

  // Highlight code asynchronously
  useEffect(() => {
    let cancelled = false;

    setHighlightedHtml(null);

    const highlight = async () => {
      try {
        const html = await highlightCode(code, lang);
        if (!cancelled && html) {
          setHighlightedHtml(html);
        }
      } catch (err) {
        console.error("Code highlighting failed:", err);
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), UI_CONSTANTS.COPY_FEEDBACK_DURATION_MS);
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg">
      {/* Header bar */}
      <div className="bg-theme-surface-strong text-theme-text-muted flex items-center justify-between px-4 py-2 text-sm">
        <span className="text-theme-text font-mono text-xs">{lang || "plaintext"}</span>
        <button
          onClick={handleCopy}
          className="text-theme-text-muted hover:text-theme-text flex items-center gap-1.5 opacity-0 transition-opacity duration-75 ease-snappy group-hover:opacity-100"
          aria-label={copied ? "Copied" : "Copy code"}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {/* Code content */}
      {highlightedHtml ? (
        <div
          className="shiki-wrapper overflow-x-auto text-sm [&_pre]:overflow-x-auto [&_pre]:p-4"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        // Fallback while Shiki loads
        <pre className="bg-theme-surface overflow-x-auto p-4 text-sm">
          <code className="text-theme-text-muted">{code}</code>
        </pre>
      )}
    </div>
  );
};

// Static components object - never recreated
const MARKDOWN_COMPONENTS = {
  code: CodeBlock,
  p: ({ children }) => <div className="markdown-block">{children}</div>,
  pre: ({ children }) => <div className="markdown-block">{children}</div>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-theme-blue inline-flex items-center gap-1 underline-offset-4 hover:underline">
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  ),
};

/**
 * Markdown renderer with syntax highlighting and LaTeX support.
 * Memoized to prevent unnecessary re-renders during parent updates.
 */
export const MarkdownContent = memo(({ content }) => (
  <ReactMarkdown
    remarkPlugins={REMARK_PLUGINS}
    rehypePlugins={REHYPE_PLUGINS}
    components={MARKDOWN_COMPONENTS}>
    {content}
  </ReactMarkdown>
));
