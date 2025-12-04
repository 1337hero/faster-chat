import { Mic, Loader2, Volume2 } from "lucide-react";
import { CHAT_STATES } from "@faster-chat/shared";

/**
 * Voice Status Indicator
 *
 * Shows current voice conversation state with visual feedback
 */
const VoiceStatusIndicator = ({ voiceControls }) => {
  if (!voiceControls.isActive) return null;

  const getStateInfo = () => {
    switch (voiceControls.currentState) {
      case CHAT_STATES.LISTENING:
        return {
          icon: Mic,
          text: "Listening...",
          color: "text-theme-green",
          bgColor: "bg-theme-green/10",
          animate: true,
        };
      case CHAT_STATES.PROCESSING:
        return {
          icon: Loader2,
          text: "Processing...",
          color: "text-theme-blue",
          bgColor: "bg-theme-blue/10",
          animate: true,
          spin: true,
        };
      case CHAT_STATES.SPEAKING:
        return {
          icon: Volume2,
          text: "Speaking...",
          color: "text-theme-mauve",
          bgColor: "bg-theme-mauve/10",
          animate: true,
        };
      case CHAT_STATES.COOLDOWN:
        return {
          icon: Loader2,
          text: "Ready...",
          color: "text-theme-overlay",
          bgColor: "bg-theme-overlay/10",
          animate: false,
        };
      default:
        return null;
    }
  };

  const stateInfo = getStateInfo();
  if (!stateInfo) return null;

  const Icon = stateInfo.icon;

  return (
    <div className={`${stateInfo.bgColor} flex items-center gap-2 rounded-full px-3 py-1.5`}>
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
    </div>
  );
};

export default VoiceStatusIndicator;
