import { memo, useRef } from "preact/compat";
import { UI_CONSTANTS } from "@faster-chat/shared";

const PaperclipIcon = ({ className, size = 20 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
};

const ImageIcon = ({ className, size = 20 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
};

const GlobeIcon = ({ className, size = 20 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
};

const SendIcon = ({ className, size = 20 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
};

const InputArea = ({ input, handleInputChange, handleSubmit, disabled }) => {
  const textareaRef = useRef(null);

  const adjustHeight = (element) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
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
    <>
      {/* Tool Buttons */}
      <div className="mb-1.5 ml-1 flex items-center gap-1">
        <button
          type="button"
          className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 rounded-xl p-2 transition-all"
          title="Add Attachment"
          disabled={disabled}>
          <PaperclipIcon size={20} />
        </button>
        <button
          type="button"
          className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-pink dark:hover:text-macchiato-pink hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 rounded-xl p-2 transition-all"
          title="Generate Image"
          disabled={disabled}>
          <ImageIcon size={20} />
        </button>
        <button
          type="button"
          className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-green dark:hover:text-macchiato-green hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 rounded-xl p-2 transition-all"
          title="Search Web"
          disabled={disabled}>
          <GlobeIcon size={20} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Message here..."
        disabled={disabled}
        rows={1}
        className="text-latte-text dark:text-macchiato-text placeholder-latte-overlay0 dark:placeholder-macchiato-overlay0 max-h-[200px] flex-1 resize-none border-none bg-transparent px-2 py-3 text-base focus:outline-none focus:ring-0"
      />

      {/* Send Button */}
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || disabled}
        type="button"
        className={`mb-0.5 flex-shrink-0 rounded-2xl p-3 transition-all duration-200 ${
          !input.trim() || disabled
            ? "bg-latte-surface1 dark:bg-macchiato-surface1 text-latte-overlay0 dark:text-macchiato-overlay0 cursor-not-allowed"
            : "btn-blue hover:-translate-y-0.5"
        } `}
        style={!input.trim() || disabled ? {} : { boxShadow: "var(--shadow-depth-md)" }}>
        <SendIcon size={20} />
      </button>
    </>
  );
};

export default memo(InputArea);
