import { create } from "zustand";
import { persist } from "zustand/middleware";

// Font presets for chat
export const FONT_PRESETS = [
  {
    id: "default",
    name: "Default",
    family: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    preview: "Inter",
  },
  {
    id: "system",
    name: "System",
    family:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    preview: "System",
  },
  {
    id: "serif",
    name: "Serif",
    family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    preview: "Georgia",
  },
  {
    id: "mono",
    name: "Mono",
    family: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    preview: "JetBrains",
  },
  {
    id: "dyslexic",
    name: "Dyslexic",
    family: '"OpenDyslexic", "Comic Sans MS", cursive, sans-serif',
    preview: "OpenDyslexic",
  },
];

// Font size presets
export const FONT_SIZE_PRESETS = [
  { id: "small", name: "Small", size: "14px" },
  { id: "medium", name: "Medium", size: "16px" },
  { id: "large", name: "Large", size: "18px" },
];

// Theme manifest - maps theme IDs to their JSON file paths
const BUNDLED_THEMES = [
  { id: "default", name: "Default", path: "/themes/default.json" },
  { id: "catppuccin", name: "Catppuccin", path: "/themes/catppuccin.json" },
  { id: "nord", name: "Nord", path: "/themes/nord.json" },
  { id: "dracula", name: "Dracula", path: "/themes/dracula.json" },
  { id: "tokyo-night", name: "Tokyo Night", path: "/themes/tokyo-night.json" },
  { id: "one-dark", name: "One Dark", path: "/themes/one-dark.json" },
  { id: "rosepine", name: "Rosé Pine", path: "/themes/rosepine.json" },
  { id: "gruvbox", name: "Gruvbox", path: "/themes/gruvbox.json" },
  { id: "solarized", name: "Solarized", path: "/themes/solarized.json" },
  { id: "night-owl", name: "Night Owl", path: "/themes/night-owl.json" },
  { id: "everforest", name: "Everforest", path: "/themes/everforest.json" },
  { id: "kanagawa", name: "Kanagawa", path: "/themes/kanagawa.json" },
  { id: "material", name: "Material", path: "/themes/material.json" },
  { id: "monokai", name: "Monokai", path: "/themes/monokai.json" },
  { id: "synthwave84", name: "Synthwave '84", path: "/themes/synthwave84.json" },
];

// Cache for loaded theme data
const themeCache = new Map();

// Load theme JSON from path
const loadTheme = async (path) => {
  if (themeCache.has(path)) {
    return themeCache.get(path);
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load theme: ${path}`);
  }

  const theme = await response.json();
  themeCache.set(path, theme);
  return theme;
};

// Apply theme colors as CSS variables to document root
const applyThemeColors = (colors, mode) => {
  const root = document.documentElement;
  const modeColors = colors[mode];

  if (!modeColors) return;

  // Set CSS variables for all theme colors
  Object.entries(modeColors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  // Extract RGB values for shadow color from the strongest canvas layer
  const shadowSource = modeColors["canvas-strong"] || modeColors.background;
  const rgb = hexToRgb(shadowSource);
  if (rgb) {
    root.style.setProperty("--shadow-color", `${rgb.r} ${rgb.g} ${rgb.b}`);
  }

  // Set inverted text color (for buttons on primary backgrounds)
  root.style.setProperty("--inverted-text", modeColors.text || modeColors.foreground);

  // Respect color scheme for form controls and native UI
  root.style.colorScheme = mode;
};

// Convert hex to RGB object
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Apply font settings to document root
const applyFontSettings = (fontId, fontSizeId) => {
  const root = document.documentElement;
  const fontPreset = FONT_PRESETS.find((f) => f.id === fontId) || FONT_PRESETS[0];
  const sizePreset = FONT_SIZE_PRESETS.find((s) => s.id === fontSizeId) || FONT_SIZE_PRESETS[1];

  root.style.setProperty("--theme-font-chat", fontPreset.family);
  root.style.setProperty("--theme-font-size-chat", sizePreset.size);
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      // Current theme ID
      themeId: "default",
      // Current mode (light/dark)
      mode: "dark",
      // Loaded theme data
      currentTheme: null,
      // Available themes
      availableThemes: BUNDLED_THEMES,
      // Loading state
      isLoading: false,
      // Font settings
      chatFont: "default",
      chatFontSize: "medium",

      // Initialize theme on app start
      initializeTheme: async () => {
        const { themeId, mode, chatFont, chatFontSize } = get();
        const themeMeta = BUNDLED_THEMES.find((t) => t.id === themeId) || BUNDLED_THEMES[0];

        set({ isLoading: true });

        try {
          const theme = await loadTheme(themeMeta.path);
          set({ currentTheme: theme, isLoading: false });
          applyThemeColors(theme.colors, mode);
          applyFontSettings(chatFont, chatFontSize);

          // Apply dark class for Tailwind
          document.documentElement.classList.toggle("dark", mode === "dark");
        } catch (error) {
          console.error("Failed to initialize theme:", error);
          set({ isLoading: false });
        }
      },

      // Set theme by ID
      setTheme: async (themeId) => {
        const themeMeta = BUNDLED_THEMES.find((t) => t.id === themeId);
        if (!themeMeta) return;

        const { mode } = get();
        set({ isLoading: true });

        try {
          const theme = await loadTheme(themeMeta.path);
          set({ themeId, currentTheme: theme, isLoading: false });
          applyThemeColors(theme.colors, mode);
        } catch (error) {
          console.error("Failed to set theme:", error);
          set({ isLoading: false });
        }
      },

      // Toggle between light and dark mode
      toggleMode: () => {
        const { mode, currentTheme } = get();
        const newMode = mode === "light" ? "dark" : "light";

        set({ mode: newMode });

        // Apply dark class for Tailwind
        document.documentElement.classList.toggle("dark", newMode === "dark");

        // Re-apply theme colors for new mode
        if (currentTheme) {
          applyThemeColors(currentTheme.colors, newMode);
        }
      },

      // Set mode explicitly
      setMode: (newMode) => {
        const { currentTheme } = get();

        set({ mode: newMode });

        // Apply dark class for Tailwind
        document.documentElement.classList.toggle("dark", newMode === "dark");

        // Re-apply theme colors for new mode
        if (currentTheme) {
          applyThemeColors(currentTheme.colors, newMode);
        }
      },

      // Set chat font
      setChatFont: (fontId) => {
        const { chatFontSize } = get();
        set({ chatFont: fontId });
        applyFontSettings(fontId, chatFontSize);
      },

      // Set chat font size
      setChatFontSize: (sizeId) => {
        const { chatFont } = get();
        set({ chatFontSize: sizeId });
        applyFontSettings(chatFont, sizeId);
      },
    }),
    {
      name: "theme-store-v3",
      // Only persist these keys
      partialize: (state) => ({
        themeId: state.themeId,
        mode: state.mode,
        chatFont: state.chatFont,
        chatFontSize: state.chatFontSize,
      }),
    }
  )
);
