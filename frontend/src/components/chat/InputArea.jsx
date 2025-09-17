import { Textarea } from '@/components/ui/textarea';
import { UI_CONSTANTS } from "@faster-chat/shared";
import { useRef, memo } from 'preact/compat';

function InputArea({ input, handleInputChange, handleSubmit, disabled }) {
  const textareaRef = useRef(null);

  const adjustHeight = (element) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, UI_CONSTANTS.INPUT_MAX_HEIGHT)}px`;
  };

  const handleChange = (e) => {
    adjustHeight(e.target);
    handleInputChange(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && input.trim()) {
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="px-4">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto flex w-full items-stretch gap-2 rounded-xl border border-latte-surface2 dark:border-macchiato-surface2 shadow-md dark:shadow-black/50 bg-latte-surface0 dark:bg-macchiato-surface0 px-3 py-3 sm:max-w-3xl"
      >
        <div className="flex flex-grow flex-col">
          <Textarea
            ref={textareaRef}
            value={input}
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

export default memo(InputArea);
