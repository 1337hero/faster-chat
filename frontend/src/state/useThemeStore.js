import { create } from "zustand";
import { persist } from "zustand/middleware";

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

      // Initialize theme on app start
      initializeTheme: async () => {
        const { themeId, mode } = get();
        const themeMeta = BUNDLED_THEMES.find((t) => t.id === themeId) || BUNDLED_THEMES[0];

        set({ isLoading: true });

        try {
          const theme = await loadTheme(themeMeta.path);
          set({ currentTheme: theme, isLoading: false });
          applyThemeColors(theme.colors, mode);

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
    }),
    {
      name: "theme-store-v2",
      // Only persist these keys
      partialize: (state) => ({
        themeId: state.themeId,
        mode: state.mode,
      }),
    }
  )
);
