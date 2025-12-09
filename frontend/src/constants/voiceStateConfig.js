import { Mic, Loader2, Volume2 } from "lucide-preact";
import { CHAT_STATES } from "@faster-chat/shared";

export const VOICE_STATE_CONFIG = {
  [CHAT_STATES.LISTENING]: {
    icon: Mic,
    text: "Listening...",
    color: "text-theme-green",
    bgColor: "bg-theme-green/10",
    animate: true,
  },
  [CHAT_STATES.PROCESSING]: {
    icon: Loader2,
    text: "Processing...",
    color: "text-theme-blue",
    bgColor: "bg-theme-blue/10",
    animate: true,
    spin: true,
  },
  [CHAT_STATES.SPEAKING]: {
    icon: Volume2,
    text: "Speaking...",
    color: "text-theme-mauve",
    bgColor: "bg-theme-mauve/10",
    animate: true,
  },
  [CHAT_STATES.COOLDOWN]: {
    icon: Loader2,
    text: "Ready...",
    color: "text-theme-overlay",
    bgColor: "bg-theme-overlay/10",
    animate: false,
  },
};
