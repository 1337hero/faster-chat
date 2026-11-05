import { useState } from "preact/hooks";
import fuzzysort from "fuzzysort";
import { Search, Star, X } from "lucide-preact";
import { INSPIRATION_PROMPTS } from "@faster-chat/shared";
import Chip from "@/components/ui/Chip";
import { useUiState } from "@/state/useUiState";

// Searchable, offline inspiration library: static data from the shared package,
// favorites persisted in uiState. Inserting a prompt goes straight to the composer.
export default function InspirationPanel({ onInsert, onClose }) {
  const favorites = useUiState((state) => state.inspirationFavorites);
  const toggleFavorite = useUiState((state) => state.toggleInspirationFavorite);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const categories = [...new Set(INSPIRATION_PROMPTS.map((entry) => entry.category))].sort();

  const searched = search
    ? fuzzysort
        .go(search, INSPIRATION_PROMPTS, { key: "prompt", threshold: -10000 })
        .map((r) => r.obj)
    : INSPIRATION_PROMPTS;
  const categoryFiltered = category
    ? searched.filter((entry) => entry.category === category)
    : searched;
  const visible = favoritesOnly
    ? categoryFiltered.filter((entry) => favorites.includes(entry.id))
    : categoryFiltered;

  return (
    <div className="bg-theme-surface border-theme-border flex max-h-[420px] flex-col overflow-hidden rounded-xl border shadow-xl">
      <div className="border-theme-surface flex items-center gap-2 border-b p-3">
        <h3 className="text-theme-text text-sm font-semibold">Inspiration</h3>
        <span className="text-theme-text-muted text-xs">{visible.length}</span>
        <div className="relative ml-auto">
          <Search
            size={13}
            className="text-theme-text-muted pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search prompts, styles"
            aria-label="Search inspiration"
            className="border-theme-surface bg-theme-canvas-alt focus:border-theme-primary focus:ring-theme-primary/30 text-theme-text placeholder:text-theme-text-muted w-40 rounded-lg border py-1 pr-2 pl-7 text-xs outline-none focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          aria-pressed={favoritesOnly}
          title="Favorites only"
          className={`rounded-lg p-1.5 transition-colors ${
            favoritesOnly
              ? "bg-theme-yellow/10 text-theme-yellow"
              : "text-theme-text-muted hover:text-theme-text"
          }`}>
          <Star size={14} fill={favoritesOnly ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspiration panel"
          className="text-theme-text-muted hover:text-theme-text rounded-lg p-1.5 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="border-theme-surface flex flex-wrap gap-1 border-b px-3 py-2">
        <Chip onClick={() => setCategory(null)} active={category === null} size="sm">
          All
        </Chip>
        {categories.map((name) => (
          <Chip key={name} onClick={() => setCategory(name)} active={category === name} size="sm">
            {name}
          </Chip>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {visible.length === 0 ? (
          <p className="text-theme-text-muted px-2 py-6 text-center text-xs">
            {favoritesOnly ? "No favorited prompts match" : "No prompts match"}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {visible.map((entry) => {
              const isFavorite = favorites.includes(entry.id);
              return (
                <li key={entry.id} className="group flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onInsert(entry.prompt)}
                    title="Insert into composer"
                    className="bg-theme-canvas-alt hover:bg-theme-surface-strong flex-1 rounded-lg p-2 text-left transition-colors">
                    <span className="text-theme-text line-clamp-2 block text-xs leading-relaxed">
                      {entry.prompt}
                    </span>
                    <span className="text-theme-text-muted mt-1.5 block truncate text-[10px]">
                      {entry.style} · {entry.category}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(entry.id)}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    aria-pressed={isFavorite}
                    className="mt-0.5 rounded-lg p-1.5 transition-colors">
                    <Star
                      size={13}
                      className={
                        isFavorite
                          ? "text-theme-yellow"
                          : "text-theme-text-muted group-hover:text-theme-text"
                      }
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
