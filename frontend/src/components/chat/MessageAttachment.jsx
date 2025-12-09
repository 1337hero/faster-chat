import { useQuery } from "@tanstack/react-query";
import { Download, File, Sparkles } from "lucide-preact";

const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

export default function MessageAttachment({ fileId }) {
  const {
    data: fileMetadata,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["file", fileId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load file");
      return response.json();
    },
  });

  const handleDownload = () => {
    window.open(`${API_BASE}/api/files/${fileId}/content`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="bg-theme-surface/50 text-theme-text-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
        <File size={16} />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !fileMetadata) {
    return (
      <div className="bg-theme-red/10 text-theme-red inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
        <File size={16} />
        <span>File unavailable</span>
      </div>
    );
  }

  const isImage = fileMetadata.mimeType?.startsWith("image/");
  const isGenerated = fileMetadata.meta?.type === "generated";

  // Render images inline
  if (isImage) {
    return (
      <div className="group relative inline-block">
        <img
          src={`${API_BASE}/api/files/${fileId}/content`}
          alt={fileMetadata.meta?.prompt || fileMetadata.filename}
          className="max-h-96 max-w-full rounded-lg shadow-md"
          loading="lazy"
        />
        {/* Overlay with download button and generated badge */}
        <div className="absolute inset-0 flex items-start justify-between rounded-lg bg-black/0 p-2 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
          {isGenerated && (
            <span className="bg-theme-pink/90 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white">
              <Sparkles size={12} />
              Generated
            </span>
          )}
          <button
            onClick={handleDownload}
            className="ml-auto rounded-full bg-white/90 p-2 text-gray-800 shadow-md transition-transform hover:scale-110"
            title="Download image">
            <Download size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Non-image files: show download button
  return (
    <button
      onClick={handleDownload}
      className="bg-theme-surface hover:bg-theme-surface-strong text-theme-text inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors">
      <File size={16} />
      <span className="max-w-[200px] truncate">{fileMetadata.filename}</span>
      <span className="text-theme-text-muted text-xs">{fileMetadata.sizeFormatted}</span>
      <Download size={14} />
    </button>
  );
}
