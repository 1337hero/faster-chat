"use client";

import { Textarea } from "@/components/ui/textarea";
import { usePathname } from "next/navigation";
import React, { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from 'use-debounce';

interface InputAreaProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
}

function InputArea({ input, handleInputChange, handleSubmit, disabled }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const [localInput, setLocalInput] = useState(input);

  const debouncedHandleChange = useDebouncedCallback(
    (value: string) => {
      handleInputChange({ target: { value } } as React.ChangeEvent<HTMLTextAreaElement>);
    },
    300
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalInput(value);
    debouncedHandleChange(value);
  };

  useEffect(() => {
    setLocalInput(input);
  }, [input]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // Reset height
      const newHeight = Math.min(textarea.scrollHeight, 240); // max height
      textarea.style.height = `${newHeight}px`;
    }
  }, [localInput]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [pathname]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && localInput.trim()) {
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
            value={localInput}
            onChange={handleChange}
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
