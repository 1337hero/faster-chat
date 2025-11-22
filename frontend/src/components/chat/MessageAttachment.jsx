import { useState, useEffect } from "preact/hooks";
import { File, Download } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

/**
 * MessageAttachment - Display file attachment in a message
 * Simple Open WebUI-style: filename + icon + download
 */
export default function MessageAttachment({ fileId }) {
  const [fileMetadata, setFileMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFileMetadata() {
      try {
        const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load file");
        }

        const data = await response.json();
        setFileMetadata(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFileMetadata();
  }, [fileId]);

  const handleDownload = () => {
    window.open(`${API_BASE}/api/files/${fileId}/content`, "_blank");
  };

  if (loading) {
    return (
      <div className="bg-latte-surface0/50 dark:bg-macchiato-surface0/50 text-latte-subtext0 dark:text-macchiato-subtext0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
        <File size={16} />
        <span>Loading...</span>
      </div>
    );
  }

  if (error || !fileMetadata) {
    return (
      <div className="bg-latte-red/10 dark:bg-macchiato-red/10 text-latte-red dark:text-macchiato-red inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
        <File size={16} />
        <span>File unavailable</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="bg-latte-surface0 dark:bg-macchiato-surface0 hover:bg-latte-surface1 dark:hover:bg-macchiato-surface1 text-latte-text dark:text-macchiato-text inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors">
      <File size={16} />
      <span className="max-w-[200px] truncate">{fileMetadata.filename}</span>
      <span className="text-latte-subtext0 dark:text-macchiato-subtext0 text-xs">
        {fileMetadata.sizeFormatted}
      </span>
      <Download size={14} />
    </button>
  );
}
