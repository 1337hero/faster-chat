import { useState, useEffect } from "preact/hooks";
import { toast } from "sonner";
import { Loader2 } from "lucide-preact";
import { REVERSE_PROMPT_LENGTHS } from "@faster-chat/shared";
import Modal from "@/components/ui/Modal";
import { useReversePrompt, usePromptModel } from "@/hooks/usePromptTools";

export default function PromptToolsModal({ fileId, onInsert, onClose }) {
  const { modelId } = usePromptModel();
  const { mutate, isPending, data, error } = useReversePrompt();
  const [length, setLength] = useState("standard");

  useEffect(() => {
    if (modelId) {
      mutate({ fileId, length, modelId });
    }
  }, [modelId, length, fileId, mutate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Could not copy prompt");
    }
  };

  const handleInsert = () => {
    onInsert(data.prompt);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Reverse prompt">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-theme-text-muted mr-1 text-xs">Length</span>
          {Object.entries(REVERSE_PROMPT_LENGTHS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setLength(value)}
              aria-pressed={length === value}
              disabled={isPending}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors duration-75 disabled:opacity-50 ${
                length === value
                  ? "bg-theme-pink text-white"
                  : "bg-theme-surface-strong text-theme-text-muted hover:text-theme-text"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {isPending && (
          <div className="text-theme-text-muted flex items-center gap-2 py-6 text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>Analyzing image...</span>
          </div>
        )}

        {error && !isPending && (
          <div className="bg-theme-red/10 text-theme-red rounded-lg px-3 py-2 text-sm">
            {error.message}
          </div>
        )}

        {!modelId && !isPending && (
          <div className="bg-theme-yellow/10 text-theme-yellow rounded-lg px-3 py-2 text-sm">
            No vision-capable chat model available. Add one under Settings to use reverse prompt.
          </div>
        )}

        {data && !isPending && (
          <div className="flex flex-col gap-4">
            <p className="text-theme-text bg-theme-canvas-alt max-h-64 overflow-y-auto rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {data.prompt}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="bg-theme-surface hover:bg-theme-surface-strong text-theme-text rounded-full px-4 py-2 text-sm font-medium transition-colors duration-75">
                Copy prompt
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="bg-theme-primary hover:bg-theme-accent rounded-full px-4 py-2 text-sm font-medium text-white transition-colors duration-75">
                Insert into composer
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
