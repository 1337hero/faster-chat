import { useRef, useEffect, useState } from "preact/hooks";
import {
  UI_CONSTANTS,
  IMAGE_GENERATION,
  ATTACHMENT_INPUT_ACCEPT,
  ATTACHMENT_TITLE_TEXT,
} from "@faster-chat/shared";
import { Paperclip, Image, Globe, Send, Mic, MicOff, WandSparkles, Lightbulb } from "lucide-preact";
import { toast } from "sonner";
import ChatMemoryButton from "./ChatMemoryButton";
import InspirationPanel from "@/components/imagegen/InspirationPanel";
import { useFileUploader } from "@/hooks/useFileUploader";
import { useFileDragDrop } from "@/hooks/useFileDragDrop";
import { usePromptModel, useEnhancePrompt } from "@/hooks/usePromptTools";
import { FilePreviewList } from "./FilePreviewList";
import { useUiState } from "@/state/useUiState";

const FILE_INPUT_ID = "chat-input-file-upload";
const IMAGE_COUNTS = Array.from({ length: IMAGE_GENERATION.MAX_IMAGES }, (_, i) => i + 1);

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
  onFilesUploaded,
  onRemoveFile,
  isLoading,
  isGenerating,
  aspectRatios,
  aspectRatio,
  onAspectRatioChange,
  imageCount,
  onImageCountChange,
  supportsImageToImage = false,
  onClearFiles,
  onSetInput,
}) => {
  const textareaRef = useRef(null);
  const { uploadFiles, uploading, currentFile } = useFileUploader({
    onFilesUploaded,
  });
  const pendingReference = useUiState((state) => state.pendingReference);
  const clearPendingReference = useUiState((state) => state.clearPendingReference);
  const imageMode = useUiState((state) => state.imageMode);
  const toggleImageMode = useUiState((state) => state.toggleImageMode);
  const setImageMode = useUiState((state) => state.setImageMode);
  const setWebSearchEnabled = useUiState((state) => state.setWebSearchEnabled);
  const imageEnhance = useUiState((state) => state.imageEnhance);
  const toggleImageEnhance = useUiState((state) => state.toggleImageEnhance);
  const setEnhanceModelId = useUiState((state) => state.setEnhanceModelId);
  const pendingPrompt = useUiState((state) => state.pendingPrompt);
  const clearPendingPrompt = useUiState((state) => state.clearPendingPrompt);
  const { visionModels, modelId: promptModelId } = usePromptModel();
  const { mutateAsync: enhancePrompt } = useEnhancePrompt();
  const [showInspirationPanel, setShowInspirationPanel] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [justEnhanced, setJustEnhanced] = useState(false);

  const atReferenceCap = imageMode && selectedFiles.length >= IMAGE_GENERATION.MAX_REFERENCE_IMAGES;
  const fileInputDisabled = disabled || uploading || atReferenceCap;
  const fileAccept = imageMode ? "image/*" : ATTACHMENT_INPUT_ACCEPT;

  const handleFiles = (files) => {
    const list = Array.from(files || []);
    if (!imageMode) {
      uploadFiles(list);
      return;
    }

    const images = list.filter((file) => file.type.startsWith("image/"));
    if (images.length < list.length) {
      toast.warning("Only image files can be attached as references");
    }

    const room = IMAGE_GENERATION.MAX_REFERENCE_IMAGES - selectedFiles.length;
    const accepted = images.slice(0, Math.max(0, room));
    if (accepted.length < images.length) {
      toast.warning(
        `You can attach up to ${IMAGE_GENERATION.MAX_REFERENCE_IMAGES} reference images`
      );
    }

    if (accepted.length > 0) {
      uploadFiles(accepted);
    }
  };

  const { dragActive, handleDrag, handleDrop } = useFileDragDrop(handleFiles);

  // Window-level drop guard: prevent browser from opening files dropped outside the input
  useEffect(() => {
    const preventFileDrop = (e) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };
    window.addEventListener("dragover", preventFileDrop);
    window.addEventListener("drop", preventFileDrop);
    return () => {
      window.removeEventListener("dragover", preventFileDrop);
      window.removeEventListener("drop", preventFileDrop);
    };
  }, []);

  // Consume a reference handed off from the gallery ("Use as reference")
  useEffect(() => {
    if (!pendingReference || !imageMode) return;
    if (selectedFiles.length >= IMAGE_GENERATION.MAX_REFERENCE_IMAGES) {
      toast.warning(
        `You can attach up to ${IMAGE_GENERATION.MAX_REFERENCE_IMAGES} reference images`
      );
      clearPendingReference();
      return;
    }
    onFilesUploaded([pendingReference]);
    clearPendingReference();
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [pendingReference, imageMode, selectedFiles.length, onFilesUploaded, clearPendingReference]);

  const insertPrompt = (text) => {
    onSetInput((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
  };

  // Consume a prompt handed off from the gallery or reverse-prompt modal
  useEffect(() => {
    if (!pendingPrompt) return;
    insertPrompt(pendingPrompt);
    clearPendingPrompt();
  }, [pendingPrompt, clearPendingPrompt]);

  const handleToggleImageMode = () => {
    if (webSearchEnabled) {
      setWebSearchEnabled(false);
    }
    setJustEnhanced(false);
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
    if (!e.target.value) {
      setJustEnhanced(false);
    }
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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (disabled) {
      return;
    }

    // Image mode: call onImageSubmit instead of normal handleSubmit
    if (imageMode && onImageSubmit) {
      // Transparent two-step: enhance first, put the expanded text in the
      // composer, and let the user confirm it with one more submit.
      if (imageEnhance && !justEnhanced && promptModelId) {
        setIsEnhancing(true);
        try {
          const result = await enhancePrompt({ prompt: input.trim(), modelId: promptModelId });
          onSetInput(result.prompt);
          setJustEnhanced(true);
        } catch (err) {
          toast.error(err.message || "Could not enhance prompt");
        } finally {
          setIsEnhancing(false);
        }
        return;
      }

      setJustEnhanced(false);
      onImageSubmit(input.trim(), selectedFiles);
      onClearFiles?.(); // references are consumed; don't leak them into the next message
      setImageMode(false); // Auto-reset after send
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      return;
    }

    handleSubmit(e);

    // Reset textarea height when clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const isSubmitDisabled = !hasContent || disabled || isEnhancing;
  const loadingBorder = isLoading || isGenerating;

  return (
    <div
      className={`bg-theme-surface relative rounded-2xl border p-2 shadow-lg transition-colors duration-150 ${
        dragActive
          ? "border-theme-primary bg-theme-primary/5"
          : loadingBorder
            ? "border-theme-primary/30"
            : "border-theme-border hover:border-theme-primary/50"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={disabled || uploading ? undefined : handleDrop}>
      {dragActive && (
        <div className="bg-theme-surface/80 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl backdrop-blur-sm">
          <div className="text-theme-primary flex items-center gap-2">
            <Paperclip size={20} />
            <span className="text-sm font-medium">Drop files to attach</span>
          </div>
        </div>
      )}
      {showInspirationPanel && imageMode && (
        <div className="absolute bottom-full left-0 z-30 w-[420px] max-w-full pb-2">
          <InspirationPanel
            onInsert={insertPrompt}
            onClose={() => setShowInspirationPanel(false)}
          />
        </div>
      )}

      <div className="flex w-full flex-col">
        <input
          id={FILE_INPUT_ID}
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={fileInputDisabled}
          className="sr-only"
          accept={fileAccept}
        />

        {uploading && currentFile && (
          <div className="text-theme-text-muted mb-2 text-xs">Uploading {currentFile}...</div>
        )}

        <FilePreviewList files={selectedFiles} onRemove={onRemoveFile} />

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

        {imageMode && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
            <span className="text-theme-text-muted mr-1 text-xs">Aspect ratio</span>
            {aspectRatios.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => onAspectRatioChange(ratio)}
                aria-pressed={ratio === aspectRatio}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors duration-75 ${
                  ratio === aspectRatio
                    ? "bg-theme-pink text-white"
                    : "bg-theme-surface-strong text-theme-text-muted hover:text-theme-text"
                }`}>
                {ratio}
              </button>
            ))}
            <span className="text-theme-text-muted mr-1 ml-3 text-xs">Count</span>
            {IMAGE_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onImageCountChange(count)}
                aria-pressed={count === imageCount}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors duration-75 ${
                  count === imageCount
                    ? "bg-theme-pink text-white"
                    : "bg-theme-surface-strong text-theme-text-muted hover:text-theme-text"
                }`}>
                {count}
              </button>
            ))}
            <span className="text-theme-text-muted mr-1 ml-3 text-xs">Prompt</span>
            <button
              type="button"
              onClick={toggleImageEnhance}
              aria-pressed={imageEnhance}
              disabled={disabled || !promptModelId}
              title={
                !promptModelId
                  ? "No vision-capable chat model available"
                  : "Enhance your prompt before generating"
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors duration-75 disabled:cursor-not-allowed disabled:opacity-50 ${
                imageEnhance
                  ? "bg-theme-pink text-white"
                  : "bg-theme-surface-strong text-theme-text-muted hover:text-theme-text"
              }`}>
              <WandSparkles size={13} />
              Enhance
            </button>
            {imageEnhance && visionModels.length > 0 && (
              <label className="flex items-center gap-1">
                <span className="text-theme-text-muted text-xs">with</span>
                <select
                  value={promptModelId}
                  onChange={(event) => setEnhanceModelId(event.target.value)}
                  aria-label="Enhancement model"
                  className="border-theme-surface bg-theme-surface-strong focus:border-theme-primary focus:ring-theme-primary/30 text-theme-text rounded-lg border px-1.5 py-1 text-xs outline-none focus:ring-2">
                  {visionModels.map((model) => (
                    <option key={model.model_id} value={model.model_id}>
                      {model.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {/* Bottom Row - Tool Buttons + Send */}
        <div className="flex items-center justify-between px-2 pb-1">
          {/* Tool Buttons - Left */}
          <div className="flex items-center gap-1">
            {(!imageMode || supportsImageToImage) && (
              <label
                htmlFor={FILE_INPUT_ID}
                className={`rounded-lg p-2 transition-colors ${
                  fileInputDisabled
                    ? "text-theme-muted/40 cursor-not-allowed opacity-50"
                    : "text-theme-muted hover:text-theme-text hover:bg-theme-surface-strong/50 cursor-pointer"
                }`}
                title={ATTACHMENT_TITLE_TEXT}
                aria-label="Add attachment">
                <Paperclip size={18} />
              </label>
            )}
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

            {imageMode && (
              <button
                type="button"
                onClick={() => setShowInspirationPanel(!showInspirationPanel)}
                aria-expanded={showInspirationPanel}
                aria-label="Inspiration library"
                className={`rounded-lg p-2 transition-colors ${
                  showInspirationPanel
                    ? "bg-theme-yellow/20 text-theme-yellow"
                    : "text-theme-muted hover:bg-theme-yellow/10 hover:text-theme-yellow"
                }`}
                title="Inspiration library">
                <Lightbulb size={18} />
              </button>
            )}

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
    </div>
  );
};

export default InputArea;
