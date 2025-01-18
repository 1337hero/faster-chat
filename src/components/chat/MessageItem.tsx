'use client';
import { Message } from "ai";
import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface MessageItemProps {
  message: Message;
}

const customStyle = {
  ...a11yDark,
  'code[class*="language-"]': {
    ...a11yDark['code[class*="language-"]'],
    fontFamily: 'Menlo, monospace', // Change the font family
  },
  'pre[class*="language-"]': {
    ...a11yDark['pre[class*="language-"]'],
    backgroundColor: '#2e3440', // Change the background color
  },
  keyword: {
    ...a11yDark.keyword,
    color: '#8fbcbb', // Change the color for keywords
  },
  string: {
    ...a11yDark.string,
    color: '#ebcb8b', // Change the color for strings
  },
};

function MessageItem({ message }: MessageItemProps) {
  return (
    <div
      className={`${
        message.role === "user" 
          ? "bg-macchiato-surface1 text-macchiato-text p-4 rounded-lg" 
          : "bg-transparent text-macchiato-text"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={customStyle}
                language={match[1]}
                PreTag="div"
                className="bg-macchiato-crust"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} bg-macchiato-crust text-macchiato-text px-4 p-1 rounded-lg w-full`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}

export default MessageItem;