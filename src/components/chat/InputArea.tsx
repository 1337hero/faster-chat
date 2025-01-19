"use client";

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
      textarea.style.height = "auto"; // Reset height
      const newHeight = Math.min(textarea.scrollHeight, 240); // max height
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
    <div className="px-4">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto flex w-full items-stretch gap-2 rounded-t-xl bg-macchiato-surface0 px-3 py-3 sm:max-w-3xl">
        <div className="flex flex-grow flex-col">
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
        </div>
      </form>
    </div>
  );
}

export default InputArea;
