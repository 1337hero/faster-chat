import { useThemeStore } from "@/state/useThemeStore";
import { Moon, Sun } from "lucide-react";
import { useRef } from "preact/hooks";

const CLICK_SOUND_PATH = "/sounds/light-on.mp3";
const CLICK_SOUND_VOLUME = 0.25;

export const ThemeToggle = () => {
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const clickSoundRef = useRef(null);

  const handleToggle = () => {
    toggleMode();

    // Lazy-load and play sound
    if (!clickSoundRef.current) {
      const audio = new Audio(CLICK_SOUND_PATH);
      audio.volume = CLICK_SOUND_VOLUME;
      clickSoundRef.current = audio;
    }

    const audio = clickSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="bg-theme-surface text-theme-text hover:bg-theme-surface-strong border-theme-border hover:border-theme-primary/50 focus:ring-theme-blue/50 rounded-xl border p-2 shadow-lg transition-all duration-200 hover:scale-105 focus:ring-2 focus:outline-none active:scale-95"
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
      {mode === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};
