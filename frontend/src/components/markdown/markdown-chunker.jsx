import React, { memo } from '@preact/compat';
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      suppressHydrationWarning>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function CodeBlock({ inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";

  async function copyToClipboard() {
    if (typeof children === "string") {
      await navigator.clipboard.writeText(children);
    }
  }

  return !inline ? (
    <div className="group relative" suppressHydrationWarning>
      <div className="flex items-center justify-between rounded-t bg-[#2e3440] px-4 py-2 text-sm text-neutral-300">
        <span className="font-mono">{lang || "text"}</span>
        <button
          onClick={copyToClipboard}
          className="opacity-0 transition-colors group-hover:opacity-100 hover:text-white"
          suppressHydrationWarning>
          <CopyIcon />
        </button>
      </div>
      <SyntaxHighlighter
        {...props}
        style={vscDarkPlus}
        language={lang}
        PreTag="div"
        className="!mt-0 !rounded-t-none"
        suppressHydrationWarning>
        {String(children).trim()}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

export const MarkdownContent = memo(function MarkdownContent({ content }) {
  return (
    <ReactMarkdown
      components={{
        code: CodeBlock,
        pre: ({ children }) => (
          <div className="markdown-block" suppressHydrationWarning>
            {children}
          </div>
        ),
        p: ({ children }) => (
          <div className="markdown-block" suppressHydrationWarning>
            {children}
          </div>
        ),
        h1: ({ children }) => <h1 suppressHydrationWarning>{children}</h1>,
        h2: ({ children }) => <h2 suppressHydrationWarning>{children}</h2>,
        h3: ({ children }) => <h3 suppressHydrationWarning>{children}</h3>,
        h4: ({ children }) => <h4 suppressHydrationWarning>{children}</h4>,
        h5: ({ children }) => <h5 suppressHydrationWarning>{children}</h5>,
        h6: ({ children }) => <h6 suppressHydrationWarning>{children}</h6>,
        ul: ({ children }) => <ul suppressHydrationWarning>{children}</ul>,
        ol: ({ children }) => <ol suppressHydrationWarning>{children}</ol>,
        li: ({ children }) => <li suppressHydrationWarning>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote suppressHydrationWarning>{children}</blockquote>
        ),
      }}
      unwrapDisallowed={true}>
      {content}
    </ReactMarkdown>
  );
});
