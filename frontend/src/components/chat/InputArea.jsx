import { useRef, useState } from "preact/hooks";
import { UI_CONSTANTS, FILE_CONSTANTS } from "@faster-chat/shared";
import { Paperclip, Image, Globe, Send } from "lucide-react";
import FileUpload, { FilePreviewList } from "./FileUpload";

const InputArea = ({ input, handleInputChange, handleSubmit, disabled }) => {
  const textareaRef = useRef(null);
  const fileUploadRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);

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
      if (!disabled && (input.trim() || selectedFiles.length > 0)) {
        handleFormSubmit(e);
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;

    // Pass fileIds to parent
    const fileIds = selectedFiles.map((f) => f.id);
    handleSubmit(e, fileIds);

    // Reset textarea height when clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Clear selected files after submission
    setSelectedFiles([]);
    setUploadError(null);
  };

  const handleFilesUploaded = (files) => {
    setSelectedFiles((prev) => [...prev, ...files]);
    setUploadError(null);
  };

  const handleFileError = (error) => {
    setUploadError(error);
    setTimeout(() => setUploadError(null), FILE_CONSTANTS.ERROR_DISPLAY_DURATION_MS);
  };

  const removeFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const isSubmitDisabled = (!input.trim() && selectedFiles.length === 0) || disabled;

  return (
    <>
      {/* File Upload Component (hidden) */}
      <FileUpload
        ref={fileUploadRef}
        onFilesUploaded={handleFilesUploaded}
        onError={handleFileError}
        disabled={disabled}
      />

      {/* Upload Error */}
      {uploadError && (
        <div className="mb-2 rounded-lg bg-latte-red/10 dark:bg-macchiato-red/10 text-latte-red dark:text-macchiato-red px-3 py-2 text-sm">
          {uploadError}
        </div>
      )}

      {/* File Previews */}
      <FilePreviewList files={selectedFiles} onRemove={removeFile} />

      {/* Tool Buttons */}
      <div className="mb-1.5 ml-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => fileUploadRef.current?.handleButtonClick?.()}
          className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 rounded-xl p-2 transition-all"
          title="Add Attachment"
          disabled={disabled}>
          <Paperclip size={20} />
        </button>
        <button
          type="button"
          className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-pink dark:hover:text-macchiato-pink hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 rounded-xl p-2 transition-all"
          title="Generate Image"
          disabled={disabled}>
          <Image size={20} />
        </button>
        <button
          type="button"
          className="text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-green dark:hover:text-macchiato-green hover:bg-latte-surface1/50 dark:hover:bg-macchiato-surface1/50 rounded-xl p-2 transition-all"
          title="Search Web"
          disabled={disabled}>
          <Globe size={20} />
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
        onClick={handleFormSubmit}
        disabled={isSubmitDisabled}
        type="button"
        className={`mb-0.5 flex-shrink-0 rounded-2xl p-3 transition-all duration-200 ${
          isSubmitDisabled
            ? "bg-latte-surface1 dark:bg-macchiato-surface1 text-latte-overlay0 dark:text-macchiato-overlay0 cursor-not-allowed"
            : "btn-blue hover:-translate-y-0.5"
        } `}
        style={
          isSubmitDisabled
            ? {}
            : { boxShadow: "var(--shadow-depth-md)" }
        }>
        <Send size={20} />
      </button>
    </>
  );
};

export default InputArea;
