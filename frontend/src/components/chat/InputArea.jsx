import { useRef, useState } from "preact/hooks";
import { UI_CONSTANTS, FILE_CONSTANTS } from "@faster-chat/shared";
import { Paperclip, Image, Globe, Send, Mic, MicOff } from "lucide-react";
import ErrorBanner from "@/components/ui/ErrorBanner";
import FileUpload, { FilePreviewList } from "./FileUpload";
import { useUiState } from "@/state/useUiState";

const InputArea = ({
  input,
  handleInputChange,
  handleSubmit,
  disabled,
  voiceControls,
  onImageSubmit,
}) => {
  const textareaRef = useRef(null);
  const fileUploadRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const imageMode = useUiState((state) => state.imageMode);
  const toggleImageMode = useUiState((state) => state.toggleImageMode);
  const setImageMode = useUiState((state) => state.setImageMode);

  const adjustHeight = (element) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, UI_CONSTANTS.INPUT_MAX_HEIGHT)}px`;
  };

  const handleChange = (e) => {
    adjustHeight(e.target);
    handleInputChange(e);
  };

  const hasContent = () => input.trim() || selectedFiles.length > 0;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && hasContent()) {
        handleFormSubmit(e);
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;

    // Image mode: call onImageSubmit instead of normal handleSubmit
    if (imageMode && onImageSubmit) {
      onImageSubmit(input.trim());
      setImageMode(false); // Auto-reset after send
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      return;
    }

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

  const isSubmitDisabled = !hasContent() || disabled;

  return (
    <div className="flex w-full flex-col">
      {/* File Upload Component (hidden) */}
      <FileUpload
        ref={fileUploadRef}
        onFilesUploaded={handleFilesUploaded}
        onError={handleFileError}
        disabled={disabled}
      />

      <ErrorBanner message={uploadError} className="mb-2" />

      {/* File Previews */}
      {!imageMode && <FilePreviewList files={selectedFiles} onRemove={removeFile} />}

      {/* Textarea - Top */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={imageMode ? "Describe the image you want to generate..." : "Ask anything..."}
        disabled={disabled}
        rows={1}
        className="text-theme-text placeholder-theme-muted max-h-[200px] w-full resize-none border-none bg-transparent px-4 py-3 text-base focus:ring-0 focus:outline-none"
      />

      {/* Bottom Row - Tool Buttons + Send */}
      <div className="flex items-center justify-between px-2 pb-1">
        {/* Tool Buttons - Left */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileUploadRef.current?.handleButtonClick?.()}
            className="text-theme-muted hover:text-theme-text hover:bg-theme-surface-strong/50 rounded-lg p-2 transition-colors"
            title="Add Attachment"
            disabled={disabled}>
            <Paperclip size={18} />
          </button>
          <button
            type="button"
            onClick={toggleImageMode}
            className={`rounded-lg p-2 transition-colors ${
              imageMode
                ? "bg-theme-pink/20 text-theme-pink"
                : "text-theme-muted hover:bg-theme-pink/10 hover:text-theme-pink"
            }`}
            title={imageMode ? "Exit Image Mode" : "Generate Image"}
            disabled={disabled}>
            <Image size={18} />
          </button>
          <button
            type="button"
            className="text-theme-muted hover:bg-theme-green/10 hover:text-theme-green rounded-lg p-2 transition-colors"
            title="Search Web"
            disabled={disabled}>
            <Globe size={18} />
          </button>

          {/* Voice Control Button */}
          {voiceControls && (
            <button
              type="button"
              onClick={voiceControls.isSupported ? voiceControls.toggleConversation : undefined}
              className={`rounded-lg p-2 transition-colors ${
                !voiceControls.isSupported
                  ? "text-theme-muted/40 cursor-not-allowed opacity-50"
                  : voiceControls.isActive
                    ? "bg-theme-red/20 text-theme-red hover:bg-theme-red/30 animate-pulse"
                    : "text-theme-muted hover:bg-theme-blue/10 hover:text-theme-blue"
              }`}
              title={
                !voiceControls.isSupported
                  ? "Voice not supported in this browser"
                  : voiceControls.isActive
                    ? "Voice Active - Click to Stop"
                    : "Click to Start Voice Chat"
              }
              disabled={disabled || !voiceControls.isSupported}>
              {voiceControls.isActive ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>

        {/* Send Button - Right */}
        <button
          onClick={handleFormSubmit}
          disabled={isSubmitDisabled}
          type="button"
          className={`rounded-xl p-2 transition-all duration-200 ${
            isSubmitDisabled
              ? "bg-theme-surface-strong text-theme-muted cursor-not-allowed"
              : "bg-theme-primary hover:bg-theme-accent text-white shadow-sm hover:scale-105 active:scale-95"
          }`}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default InputArea;
