import { useQuery } from "@tanstack/react-query";
import { Download, File } from "lucide-react";

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
