import { useUiState } from '@/state/useUiState';
import { useEffect, useRef, useState } from 'preact/hooks';

const CLICK_SOUND_PATH = '/sounds/light-on.mp3';
const CLICK_SOUND_VOLUME = 0.25;

export function ThemeToggle() {
  const theme = useUiState((state) => state.theme);
  const toggleTheme = useUiState((state) => state.toggleTheme);
  const initializeTheme = useUiState((state) => state.initializeTheme);
  const [mounted, setMounted] = useState(false);
  const clickSoundRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    initializeTheme();
    if (typeof window !== 'undefined' && !clickSoundRef.current) {
      const audio = new Audio(CLICK_SOUND_PATH);
      audio.volume = CLICK_SOUND_VOLUME;
      clickSoundRef.current = audio;
    }
  }, [initializeTheme]);

  const handleToggle = () => {
    toggleTheme();

    const audio = clickSoundRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  if (!mounted) {
    return (
      <button className="rounded-md p-2 opacity-0">
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className="rounded-md p-2 transition-colors hover:bg-latte-surface0 dark:hover:bg-macchiato-surface0 hover:shadow-sm"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-latte-text dark:text-macchiato-text">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-latte-text dark:text-macchiato-text">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
