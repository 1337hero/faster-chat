import { useThemeStore } from "@/state/useThemeStore";
import { Moon, Sun } from "lucide-preact";
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
      className="text-theme-text-muted hover:bg-theme-surface-strong/50 hover:text-theme-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}>
      {mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};
