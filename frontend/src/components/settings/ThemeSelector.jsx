import { useState, useEffect } from "preact/hooks";
import { useThemeStore } from "@/state/useThemeStore";
import { Check, Moon, Sun } from "lucide-react";

// Mini color swatches showing the theme's personality
const ThemeSwatch = ({ colors, mode }) => {
  const modeColors = colors?.[mode];
  if (!modeColors) return null;

  return (
    <div className="flex gap-0.5">
      <div className="h-4 w-4 rounded-l-sm" style={{ backgroundColor: modeColors.primary }} />
      <div className="h-4 w-4" style={{ backgroundColor: modeColors.accent }} />
      <div className="h-4 w-4 rounded-r-sm" style={{ backgroundColor: modeColors.blue }} />
    </div>
  );
};

// Theme card component
const ThemeCard = ({ theme, isSelected, onSelect, mode }) => {
  const colors = theme.colors?.[mode];

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={`group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200 ${
        isSelected
          ? "border-theme-primary bg-theme-primary/10 ring-theme-primary/30 ring-2"
          : "border-theme-surface-stronger bg-theme-surface hover:border-theme-primary/50 hover:bg-theme-surface-strong"
      }`}>
      {/* Theme Preview */}
      <div
        className="flex h-16 w-full items-end justify-between overflow-hidden rounded-md p-2"
        style={{ backgroundColor: colors?.background }}>
        {/* Mini chat preview */}
        <div className="flex w-full flex-col gap-1">
          <div
            className="h-2 w-3/4 rounded"
            style={{ backgroundColor: colors?.["surface-strong"] }}
          />
          <div className="h-2 w-1/2 rounded" style={{ backgroundColor: colors?.primary }} />
        </div>
      </div>

      {/* Theme name and swatches */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            isSelected ? "text-theme-primary" : "text-theme-text"
          }`}>
          {theme.name}
        </span>
        <ThemeSwatch colors={theme.colors} mode={mode} />
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="bg-theme-primary absolute -top-1 -right-1 rounded-full p-0.5">
          <Check size={12} className="text-theme-canvas-strong" />
        </div>
      )}
    </button>
  );
};

// Mode toggle button
const ModeToggle = ({ mode, setMode }) => {
  const modes = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div className="bg-theme-surface border-theme-surface-stronger inline-flex gap-1 rounded-lg border p-1">
      {modes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mode === id
              ? "bg-theme-primary text-theme-canvas-strong shadow-sm"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong"
          }`}>
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
};

export const ThemeSelector = () => {
  const { themeId, mode, availableThemes, currentTheme, setTheme, setMode } = useThemeStore();

  // Build theme objects with their data for display
  const themesWithData = availableThemes.map((t) => ({
    ...t,
    colors: currentTheme?.id === t.id ? currentTheme.colors : null,
  }));

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div>
        <label className="text-theme-text-muted mb-2 block text-sm font-medium">Appearance</label>
        <ModeToggle mode={mode} setMode={setMode} />
      </div>

      {/* Theme Grid */}
      <div>
        <label className="text-theme-text-muted mb-3 block text-sm font-medium">Color Theme</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {themesWithData.map((theme) => (
            <ThemeCardWithData
              key={theme.id}
              themeId={theme.id}
              themeName={theme.name}
              themePath={theme.path}
              isSelected={themeId === theme.id}
              onSelect={setTheme}
              mode={mode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Separate component that loads its own theme data for preview
const ThemeCardWithData = ({ themeId, themeName, themePath, isSelected, onSelect, mode }) => {
  // Load theme data for preview
  const [themeData, setThemeData] = useState(null);

  useEffect(() => {
    fetch(themePath)
      .then((res) => res.json())
      .then(setThemeData)
      .catch(console.error);
  }, [themePath]);

  const colors = themeData?.colors?.[mode];

  return (
    <button
      onClick={() => onSelect(themeId)}
      className={`group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200 ${
        isSelected
          ? "border-theme-primary bg-theme-primary/10 ring-theme-primary/30 ring-2"
          : "border-theme-surface-stronger bg-theme-surface hover:border-theme-primary/50 hover:bg-theme-surface-strong"
      }`}>
      {/* Theme Preview */}
      <div
        className="flex h-16 w-full items-end justify-between overflow-hidden rounded-md p-2 transition-colors"
        style={{ backgroundColor: colors?.background || "#1e1e2e" }}>
        {/* Mini chat preview */}
        <div className="flex w-full flex-col gap-1">
          <div
            className="h-2 w-3/4 rounded transition-colors"
            style={{ backgroundColor: colors?.["surface-strong"] || "#363a4f" }}
          />
          <div
            className="h-2 w-1/2 rounded transition-colors"
            style={{ backgroundColor: colors?.primary || "#c6a0f6" }}
          />
        </div>
      </div>

      {/* Theme name and swatches */}
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            isSelected ? "text-theme-primary" : "text-theme-text"
          }`}>
          {themeName}
        </span>
        {colors && (
          <div className="flex gap-0.5">
            <div
              className="h-4 w-4 rounded-l-sm transition-colors"
              style={{ backgroundColor: colors.primary }}
            />
            <div className="h-4 w-4 transition-colors" style={{ backgroundColor: colors.accent }} />
            <div
              className="h-4 w-4 rounded-r-sm transition-colors"
              style={{ backgroundColor: colors.blue }}
            />
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="bg-theme-primary absolute -top-1 -right-1 rounded-full p-0.5">
          <Check size={12} className="text-theme-canvas-strong" />
        </div>
      )}
    </button>
  );
};
