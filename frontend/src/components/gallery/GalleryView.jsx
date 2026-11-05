import { useState } from "preact/hooks";
import { useNavigate } from "@tanstack/react-router";
import fuzzysort from "fuzzysort";
import { toast } from "sonner";
import { FILE_CATEGORIES, formatFileSize } from "@faster-chat/shared";
import { API_BASE } from "@/lib/api";
import { useImageGallery } from "@/hooks/useImageGallery";
import { useUiState } from "@/state/useUiState";
import PromptToolsModal from "@/components/imagegen/PromptToolsModal";
import {
  Copy,
  Download,
  ImageOff,
  MessageSquare,
  PenTool,
  ScanText,
  Search,
  Star,
} from "lucide-preact";

const ACTION_BUTTON =
  "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong/50 rounded-md p-1.5 transition-colors";

// Maps a gallery image to the attachment file shape the composer expects (same
// fields POST /api/files returns), so a generated image can be reused as a reference.
const toReferenceFile = (image) => ({
  id: image.id,
  filename: image.filename,
  size: image.size,
  sizeFormatted: formatFileSize(image.size),
  mimeType: image.mimeType,
  category: FILE_CATEGORIES.IMAGE,
});

const GalleryCard = ({
  image,
  onToggleFavorite,
  onOpenChat,
  onUseAsReference,
  onReversePrompt,
}) => {
  const handleCopyPrompt = async () => {
    if (!image.prompt) return;
    try {
      await navigator.clipboard.writeText(image.prompt);
      toast.success("Prompt copied");
    } catch {
      toast.error("Could not copy prompt");
    }
  };

  return (
    <div className="bg-theme-canvas-alt border-theme-border hover:border-theme-surface-strong group flex flex-col overflow-hidden rounded-xl border transition-colors">
      <div className="relative aspect-square w-full overflow-hidden bg-black/5">
        <img
          src={`${API_BASE}/api/files/${image.id}/content`}
          alt={image.prompt || image.filename}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <button
          type="button"
          onClick={() => onToggleFavorite(image.id)}
          aria-label={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={image.isFavorite}
          className="bg-theme-canvas/80 hover:bg-theme-canvas absolute top-2 right-2 rounded-full p-2 transition-colors">
          <Star
            size={16}
            className={image.isFavorite ? "text-theme-yellow" : "text-theme-text-muted"}
            fill={image.isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-theme-text line-clamp-2 text-sm font-medium" title={image.prompt}>
          {image.prompt || "No prompt"}
        </p>
        <p className="text-theme-text-muted text-xs">
          {image.modelDisplayName || image.model}
          {image.aspectRatio && <span> · {image.aspectRatio}</span>}
          {image.size > 0 && <span> · {formatFileSize(image.size)}</span>}
        </p>

        <div className="mt-auto flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={handleCopyPrompt}
            disabled={!image.prompt}
            aria-label="Copy prompt"
            className={`${ACTION_BUTTON} disabled:opacity-40`}>
            <Copy size={14} />
          </button>
          <a
            href={`${API_BASE}/api/files/${image.id}/content`}
            download={image.filename}
            aria-label="Download image"
            className={ACTION_BUTTON}>
            <Download size={14} />
          </a>
          {image.chatId && (
            <button
              type="button"
              onClick={() => onOpenChat(image.chatId)}
              aria-label="Open source chat"
              className={ACTION_BUTTON}>
              <MessageSquare size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onUseAsReference(toReferenceFile(image))}
            aria-label="Use as reference"
            className={ACTION_BUTTON}>
            <PenTool size={14} />
          </button>
          <button
            type="button"
            onClick={() => onReversePrompt(image)}
            aria-label="Reverse prompt"
            className={ACTION_BUTTON}>
            <ScanText size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const GalleryView = () => {
  const { images, isLoading, error, toggleFavorite } = useImageGallery();
  const navigate = useNavigate();
  const setPendingReference = useUiState((state) => state.setPendingReference);
  const setPendingPrompt = useUiState((state) => state.setPendingPrompt);
  const setImageMode = useUiState((state) => state.setImageMode);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [reversePromptImage, setReversePromptImage] = useState(null);

  const handleUseAsReference = (file) => {
    // Entering image mode is what makes the composer accept the pending reference.
    setImageMode(true);
    setPendingReference(file);
    navigate({ to: "/" });
  };

  const handleInsertPrompt = (text) => {
    // Hand the prompt to the composer and take the user to a chat to use it.
    setPendingPrompt(text);
    setReversePromptImage(null);
    navigate({ to: "/" });
  };

  const searchResults = search
    ? fuzzysort.go(search, images, { key: "prompt", threshold: -10000 }).map((result) => result.obj)
    : images;
  const visibleImages = favoritesOnly
    ? searchResults.filter((image) => image.isFavorite)
    : searchResults;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-theme-text-muted text-sm">Loading gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-theme-red text-sm">Failed to load gallery</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-theme-surface border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-theme-text text-2xl font-semibold">Image Gallery</h1>
            <p className="text-theme-text-muted mt-1 text-sm">
              Every image you have generated, newest first
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                className="text-theme-text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search prompts"
                aria-label="Search prompts"
                className="border-theme-surface bg-theme-canvas-alt focus:border-theme-primary focus:ring-theme-primary/30 text-theme-text placeholder:text-theme-text-muted w-56 rounded-lg border py-1.5 pr-3 pl-8 text-sm outline-none focus:ring-2"
              />
            </div>
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              aria-pressed={favoritesOnly}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                favoritesOnly
                  ? "border-theme-yellow/40 bg-theme-yellow/10 text-theme-yellow"
                  : "border-theme-surface text-theme-text-muted hover:text-theme-text"
              }`}>
              <Star size={14} fill={favoritesOnly ? "currentColor" : "none"} />
              Favorites
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <ImageOff className="text-theme-text-muted h-10 w-10" />
            <p className="text-theme-text font-medium">No generated images yet</p>
            <p className="text-theme-text-muted text-sm">
              Images you generate in chat will show up here.
            </p>
          </div>
        ) : visibleImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <p className="text-theme-text font-medium">No matching images</p>
            <p className="text-theme-text-muted text-sm">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleImages.map((image) => (
              <GalleryCard
                key={image.id}
                image={image}
                onToggleFavorite={toggleFavorite}
                onOpenChat={(chatId) => navigate({ to: `/chat/${chatId}` })}
                onUseAsReference={handleUseAsReference}
                onReversePrompt={setReversePromptImage}
              />
            ))}
          </div>
        )}
      </div>

      {reversePromptImage && (
        <PromptToolsModal
          fileId={reversePromptImage.id}
          onInsert={handleInsertPrompt}
          onClose={() => setReversePromptImage(null)}
        />
      )}
    </div>
  );
};

export default GalleryView;
