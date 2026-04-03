import { memo, useState, useEffect } from "@preact/compat";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, Download, WrapText } from "lucide-preact";
import { highlightCode } from "@/lib/shiki";
import { UI_CONSTANTS } from "@faster-chat/shared";
import "katex/dist/katex.min.css";

// Map language to file extension for downloads
const LANG_EXTENSIONS = {
  javascript: "js",
  typescript: "ts",
  jsx: "jsx",
  tsx: "tsx",
  python: "py",
  ruby: "rb",
  rust: "rs",
  csharp: "cs",
  cpp: "cpp",
  bash: "sh",
  shell: "sh",
  powershell: "ps1",
  dockerfile: "dockerfile",
  yaml: "yaml",
  yml: "yml",
  markdown: "md",
  plaintext: "txt",
};

// Static plugin arrays - never recreated
const REMARK_PLUGINS = [remarkMath, remarkGfm];
const REHYPE_PLUGINS = [rehypeKatex];

// Toolbar button for code block actions
const ToolbarButton = ({ onClick, icon: Icon, title, ariaLabel, active = false }) => (
  <button
    onClick={onClick}
    className={`ease-snappy rounded p-1.5 transition-colors duration-75 ${
      active
        ? "bg-white/10 text-theme-text"
        : "text-theme-text-muted hover:bg-white/8 hover:text-theme-text"
    }`}
    aria-label={ariaLabel}
    title={title}>
    <Icon className="h-3.5 w-3.5" />
  </button>
);

/**
 * Code block with Shiki syntax highlighting.
 * Supports dual themes via CSS variables (responds to .dark class).
 */
const CodeBlock = ({ inline, className, children, node }) => {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState(null);

  const lang = className?.match(/language-(\w+)/)?.[1] ?? "";
  const code = String(children).trim();

  // Detect inline code: explicit inline prop, no language class, or single-line without parent pre
  // react-markdown v9+ doesn't reliably pass inline prop, so we use heuristics
  const isInline = inline || (!className && !code.includes("\n") && node?.tagName !== "pre");

  // Inline code - no highlighting needed
  if (isInline) {
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

  const handleDownload = () => {
    const ext = LANG_EXTENSIONS[lang] || lang || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded code.${ext}`);
  };

  const wrapClasses = wrap
    ? "[&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap [&_code]:break-words"
    : "[&_pre]:overflow-x-auto";

  return (
    <div className="bg-theme-surface group relative my-4 overflow-hidden rounded-lg border border-white/[0.06]">
      {/* Header bar */}
      <div className="bg-theme-surface-strong flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <span className="text-theme-text-muted font-mono text-[11px] tracking-wider uppercase">
          {lang || "plaintext"}
        </span>
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={handleDownload}
            icon={Download}
            title="Download"
            ariaLabel="Download code"
          />
          <ToolbarButton
            onClick={() => setWrap((w) => !w)}
            icon={WrapText}
            title={wrap ? "Disable wrap" : "Enable wrap"}
            ariaLabel={wrap ? "Disable word wrap" : "Enable word wrap"}
            active={wrap}
          />
          <ToolbarButton
            onClick={handleCopy}
            icon={copied ? Check : Copy}
            title="Copy"
            ariaLabel={copied ? "Copied" : "Copy code"}
          />
        </div>
      </div>

      {/* Code content — [&_pre]:!bg-transparent strips Shiki's inline background */}
      {highlightedHtml ? (
        <div
          className={`shiki-wrapper text-sm [&_pre]:!bg-transparent [&_pre]:!rounded-none [&_pre]:p-4 ${wrapClasses}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre
          className={`p-4 text-sm ${wrap ? "break-words whitespace-pre-wrap" : "overflow-x-auto"}`}>
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
