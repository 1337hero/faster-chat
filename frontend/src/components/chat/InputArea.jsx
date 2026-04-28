import { useRef, useState } from "preact/hooks";
import {
  UI_CONSTANTS,
  FILE_CONSTANTS,
  ATTACHMENT_INPUT_ACCEPT,
  ATTACHMENT_TITLE_TEXT,
} from "@faster-chat/shared";
import { Paperclip, Image, Globe, Send, Mic, MicOff } from "lucide-preact";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ChatMemoryButton from "./ChatMemoryButton";
import { useFileUploader, FilePreviewList } from "./FileUpload";
import { useUiState } from "@/state/useUiState";

const FILE_INPUT_ID = "chat-input-file-upload";

const InputArea = ({
  input,
  handleInputChange,
  handleSubmit,
  disabled,
  voiceControls,
  onImageSubmit,
  webSearchEnabled,
  onToggleWebSearch,
  modelSupportsTools,
  chatId,
  selectedFiles,
  setSelectedFiles,
}) => {
  const textareaRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);
  const { uploadFiles, uploading, currentFile } = useFileUploader({
    onFilesUploaded: (files) => {
      setSelectedFiles((prev) => [...prev, ...files]);
      setUploadError(null);
    },
    onError: (msg) => {
      setUploadError(msg);
      setTimeout(() => setUploadError(null), FILE_CONSTANTS.ERROR_DISPLAY_DURATION_MS);
    },
  });
  const imageMode = useUiState((state) => state.imageMode);
  const toggleImageMode = useUiState((state) => state.toggleImageMode);
  const setImageMode = useUiState((state) => state.setImageMode);
  const setWebSearchEnabled = useUiState((state) => state.setWebSearchEnabled);

  const handleToggleImageMode = () => {
    if (webSearchEnabled) {
      setWebSearchEnabled(false);
    }
    toggleImageMode();
  };

  const handleToggleWebSearch = () => {
    if (imageMode) {
      setImageMode(false);
    }
    onToggleWebSearch();
  };

  const adjustHeight = (element) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, UI_CONSTANTS.INPUT_MAX_HEIGHT)}px`;
  };

  const handleChange = (e) => {
    adjustHeight(e.target);
    handleInputChange(e);
  };

  const hasContent = input.trim() || selectedFiles.length > 0;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && hasContent) {
        handleFormSubmit(e);
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (disabled) {
      return;
    }

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

    // Clear upload error (files will be cleared by parent on success)
    setUploadError(null);
  };

  const removeFile = (fileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleFileChange = (e) => {
    uploadFiles(e.target.files);
    e.target.value = "";
  };

  const isSubmitDisabled = !hasContent || disabled;

  return (
    <div className="flex w-full flex-col">
      <input
        id={FILE_INPUT_ID}
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="sr-only"
        accept={ATTACHMENT_INPUT_ACCEPT}
      />

      {uploading && currentFile && (
        <div className="text-theme-text-muted mb-2 text-xs">Uploading {currentFile}...</div>
      )}

      <ErrorBanner message={uploadError} className="mb-2" />

      {!imageMode && <FilePreviewList files={selectedFiles} onRemove={removeFile} />}

      {/* Textarea - Top */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={imageMode ? "Describe the image you want to generate..." : "Ask anything..."}
        aria-label="Message input"
        disabled={disabled}
        rows={1}
        className="text-theme-text placeholder-theme-muted max-h-[200px] w-full resize-none border-none bg-transparent px-4 py-3 text-base focus:ring-0 focus:outline-none"
      />

      {/* Bottom Row - Tool Buttons + Send */}
      <div className="flex items-center justify-between px-2 pb-1">
        {/* Tool Buttons - Left */}
        <div className="flex items-center gap-1">
          <label
            htmlFor={FILE_INPUT_ID}
            className={`rounded-lg p-2 transition-colors ${
              disabled || uploading
                ? "text-theme-muted/40 cursor-not-allowed opacity-50"
                : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-strong/50 cursor-pointer"
            }`}
            title={ATTACHMENT_TITLE_TEXT}
            aria-label="Add attachment">
            <Paperclip size={18} />
          </label>
          <button
            type="button"
            onClick={handleToggleImageMode}
            className={`rounded-lg p-2 transition-colors ${
              imageMode
                ? "bg-theme-pink/20 text-theme-pink"
                : "text-theme-muted hover:bg-theme-pink/10 hover:text-theme-pink"
            }`}
            title={imageMode ? "Exit Image Mode" : "Generate Image"}
            aria-label={imageMode ? "Exit image mode" : "Generate image"}
            disabled={disabled}>
            <Image size={18} />
          </button>
          <button
            type="button"
            onClick={modelSupportsTools ? handleToggleWebSearch : undefined}
            className={`rounded-lg p-2 transition-colors ${
              !modelSupportsTools
                ? "text-theme-muted/40 cursor-not-allowed opacity-50"
                : webSearchEnabled
                  ? "bg-theme-green/20 text-theme-green"
                  : "text-theme-muted hover:bg-theme-green/10 hover:text-theme-green"
            }`}
            title={
              !modelSupportsTools
                ? "This model doesn't support web search"
                : webSearchEnabled
                  ? "Disable Web Search"
                  : "Search Web"
            }
            aria-label={
              !modelSupportsTools
                ? "This model doesn't support web search"
                : webSearchEnabled
                  ? "Disable web search"
                  : "Search web"
            }
            aria-pressed={webSearchEnabled}
            disabled={disabled || !modelSupportsTools}>
            <Globe size={18} />
          </button>
          <ChatMemoryButton chatId={chatId} disabled={disabled} />

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
              aria-label={
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
          aria-label="Send message"
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
