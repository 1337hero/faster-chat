import { Settings } from "lucide-react";
import { VOICE_STATE_CONFIG } from "@/constants/voiceStateConfig";

/**
 * Voice Status Indicator
 *
 * Shows current voice conversation state with visual feedback.
 * Clickable to open voice settings modal.
 */
const VoiceStatusIndicator = ({ voiceControls, onOpenSettings }) => {
  if (!voiceControls.isActive) return null;

  const stateInfo = VOICE_STATE_CONFIG[voiceControls.currentState];
  if (!stateInfo) return null;

  const Icon = stateInfo.icon;

  return (
    <button
      type="button"
      onClick={onOpenSettings}
      className={`${stateInfo.bgColor} flex items-center gap-2 rounded-full px-3 py-1.5 cursor-pointer transition-all duration-150 ease-snappy hover:scale-105 hover:shadow-md active:scale-95`}
      title="Voice Settings">
      <Icon
        size={16}
        className={`${stateInfo.color} ${stateInfo.spin ? "animate-spin" : ""} ${stateInfo.animate ? "animate-pulse" : ""}`}
      />
      <span className={`${stateInfo.color} text-xs font-medium`}>{stateInfo.text}</span>

      {/* Transcript Display */}
      {voiceControls.transcript && voiceControls.isListening && (
        <span className="text-theme-text-muted ml-1 text-xs italic">
          "{voiceControls.transcript}"
        </span>
      )}

      <Settings size={14} className={`${stateInfo.color} opacity-60`} />
    </button>
  );
};

export default VoiceStatusIndicator;
