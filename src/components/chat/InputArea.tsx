"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { KeyboardEvent, useEffect, useRef } from "react";

interface InputAreaProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
}

function InputArea({ input, handleInputChange, handleSubmit, disabled }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      const newHeight = Math.min(textarea.scrollHeight, 192); // max height
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  return (
    <div className="fixed bottom-2 left-0 right-0 px-4">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto flex w-full items-stretch gap-2 rounded-t-xl bg-transparent px-3 py-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] sm:max-w-3xl dark:bg-white/5">
        <div className="flex flex-1 flex-col">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            disabled={disabled}
            resizable={false}
            rows={1}
          />
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <Button
              type="submit"
              disabled={disabled || !input.trim()}
              className="-mb-1 -mr-1 inline-flex h-9 w-9 items-center justify-center gap-2 rounded-full bg-blue-700/70 p-2 text-neutral-100 shadow hover:bg-blue-600/70">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="!size-5">
                <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
                <path d="m21.854 2.147-10.94 10.939" />
              </svg>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default InputArea;
