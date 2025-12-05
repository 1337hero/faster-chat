import { IMAGE_MODELS } from "@faster-chat/shared";
import { Sparkles, X } from "lucide-react";

const ImageModeIndicator = ({ onClose }) => {
  return (
    <div className="bg-theme-pink/10 border-theme-pink/30 text-theme-pink mb-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
      <Sparkles size={14} className="shrink-0" />
      <span className="font-medium">Image Mode</span>
      <span className="text-theme-pink/70">({IMAGE_MODELS.DISPLAY_NAME})</span>
      <button
        onClick={onClose}
        className="hover:bg-theme-pink/20 ml-auto rounded p-0.5 transition-colors"
        aria-label="Exit image mode">
        <X size={14} />
      </button>
    </div>
  );
};

export default ImageModeIndicator;
