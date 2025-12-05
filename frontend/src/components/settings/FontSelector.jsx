import { useThemeStore, FONT_PRESETS, FONT_SIZE_PRESETS } from "@/state/useThemeStore";
import { Check } from "lucide-react";

// Font card component - shows preview in actual font
const FontCard = ({ font, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(font.id)}
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all duration-200 ${
        isSelected
          ? "border-theme-primary bg-theme-primary/10 ring-theme-primary/30 ring-2"
          : "border-theme-surface-stronger bg-theme-surface hover:border-theme-primary/50 hover:bg-theme-surface-strong"
      }`}>
      {/* Font Preview */}
      <div className="text-theme-text text-2xl" style={{ fontFamily: font.family }}>
        Aa
      </div>

      {/* Font name */}
      <span
        className={`text-sm font-medium ${
          isSelected ? "text-theme-primary" : "text-theme-text-muted"
        }`}>
        {font.name}
      </span>

      {/* Selected indicator */}
      {isSelected && (
        <div className="bg-theme-primary absolute -top-1 -right-1 rounded-full p-0.5">
          <Check size={12} className="text-theme-canvas-strong" />
        </div>
      )}
    </button>
  );
};

// Font size toggle
const FontSizeToggle = ({ currentSize, setSize }) => {
  return (
    <div className="bg-theme-surface border-theme-surface-stronger inline-flex gap-1 rounded-lg border p-1">
      {FONT_SIZE_PRESETS.map(({ id, name }) => (
        <button
          key={id}
          onClick={() => setSize(id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            currentSize === id
              ? "bg-theme-primary text-theme-canvas-strong shadow-sm"
              : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong"
          }`}>
          {name}
        </button>
      ))}
    </div>
  );
};

export const FontSelector = () => {
  const chatFont = useThemeStore((state) => state.chatFont);
  const chatFontSize = useThemeStore((state) => state.chatFontSize);
  const setChatFont = useThemeStore((state) => state.setChatFont);
  const setChatFontSize = useThemeStore((state) => state.setChatFontSize);

  return (
    <div className="space-y-6">
      {/* Font Family */}
      <div>
        <label className="text-theme-text-muted mb-3 block text-sm font-medium">Chat Font</label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {FONT_PRESETS.map((font) => (
            <FontCard
              key={font.id}
              font={font}
              isSelected={chatFont === font.id}
              onSelect={setChatFont}
            />
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-theme-text-muted mb-2 block text-sm font-medium">
          Chat Font Size
        </label>
        <FontSizeToggle currentSize={chatFontSize} setSize={setChatFontSize} />
      </div>
    </div>
  );
};
