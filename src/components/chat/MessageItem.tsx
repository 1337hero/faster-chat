"use client";
import { Message } from "ai";
import React, { memo, useMemo } from "react";
import toast from "react-hot-toast";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch (err) {
    console.log(err);
    toast.error("Failed to copy");
  }
};

const MessageItem = memo(function MessageItem({ message }: { message: Message }) {
  // Split content into blocks only when complete
  const blocks = useMemo(() => {
    return message.content.split(/(```[\s\S]*?```)/g);
  }, [message.content]);

  const containerClassName =
    message.role === "user"
      ? "bg-macchiato-surface1 text-macchiato-text p-4 rounded-lg"
      : "bg-transparent text-macchiato-text";

  return (
    <div className={containerClassName}>
      {blocks.map((block, i) => {
        if (block.startsWith("```")) {
          // Parse language and code
          const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
          if (!match) return block;

          const [, lang, code] = match;
          return (
            <div key={i} className="relative my-4">
              <div className="flex items-center justify-between rounded-t bg-[#2e3440] px-4 py-2 text-sm text-neutral-300">
                <span className="font-mono">{lang || "text"}</span>
                <button
                  onClick={() => copyToClipboard(code)}
                  className="transition-colors hover:text-white">
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
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              </div>
              <SyntaxHighlighter
                language={lang || "text"}
                style={a11yDark}
                aria-label={`Code snippet in ${lang}`}
                className="!mt-0 rounded-t-none">
                {code.trim()}
              </SyntaxHighlighter>
            </div>
          );
        }
        // Regular text - handle newlines
        return (
          <p key={i} className="my-4 whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
});

export default MessageItem;
