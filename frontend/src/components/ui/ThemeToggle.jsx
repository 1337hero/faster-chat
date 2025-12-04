import { useUiState } from "@/state/useUiState";
import { useEffect, useRef } from "preact/hooks";
import { Sun, Moon } from "lucide-react";

const CLICK_SOUND_PATH = "/sounds/light-on.mp3";
const CLICK_SOUND_VOLUME = 0.25;

export const ThemeToggle = () => {
  const theme = useUiState((state) => state.theme);
  const toggleTheme = useUiState((state) => state.toggleTheme);
  const clickSoundRef = useRef(null);

  useEffect(() => {
    if (!clickSoundRef.current) {
      const audio = new Audio(CLICK_SOUND_PATH);
      audio.volume = CLICK_SOUND_VOLUME;
      clickSoundRef.current = audio;
    }
  }, []);

  const handleToggle = () => {
    toggleTheme();

    const audio = clickSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="bg-latte-surface0 text-latte-text hover:bg-latte-surface1 dark:bg-macchiato-surface0 dark:text-macchiato-text dark:hover:bg-macchiato-surface1 focus:ring-latte-blue/50 dark:focus:ring-macchiato-blue/50 rounded-xl p-2 transition-all duration-200 hover:scale-105 focus:ring-2 focus:outline-none active:scale-95"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};
