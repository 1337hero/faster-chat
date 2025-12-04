import React from "@preact/compat";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const CopyIcon = () => {
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
      strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16 c-1.1 0 -2 -0.9 -2 -2 V4 c0 -1.1 0.9 -2 2 -2 h10 c1.1 0 2 0.9 2 2" />
    </svg>
  );
};

export const CodeBlock = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";

  async function copyToClipboard() {
    if (typeof children === "string") {
      await navigator.clipboard.writeText(children);
    }
  }

  return !inline ? (
    <div className="group relative">
      <div className="bg-theme-surface-strong text-theme-text-muted flex items-center justify-between rounded-t px-4 py-2 text-sm">
        <span className="text-theme-text font-mono">{lang || "text"}</span>
        <button
          onClick={copyToClipboard}
          className="hover:text-theme-text opacity-0 transition-colors group-hover:opacity-100">
          <CopyIcon />
        </button>
      </div>
      <SyntaxHighlighter
        {...props}
        style={vscDarkPlus}
        language={lang}
        PreTag="div"
        className="!mt-0 !rounded-t-none">
        {String(children).trim()}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

export const MarkdownContent = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code: CodeBlock,
        pre: ({ children }) => <div className="markdown-block">{children}</div>,
        p: ({ children }) => <div className="markdown-block">{children}</div>,
      }}
      unwrapDisallowed={true}>
      {content}
    </ReactMarkdown>
  );
};
