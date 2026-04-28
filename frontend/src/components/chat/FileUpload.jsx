import { useState } from "preact/hooks";
import { FILE_CATEGORIES, FILE_CONSTANTS, formatFileSize } from "@faster-chat/shared";
import { toast } from "sonner";
import { X, File } from "lucide-preact";
import { API_BASE } from "@/lib/api";

const CATEGORY_LABELS = {
  [FILE_CATEGORIES.IMAGE]: "Image",
  [FILE_CATEGORIES.PDF]: "PDF",
  [FILE_CATEGORIES.TEXT_LIKE]: "Text",
  [FILE_CATEGORIES.OFFICE_MODERN]: "Office",
  [FILE_CATEGORIES.OFFICE_LEGACY]: "Office",
  [FILE_CATEGORIES.UNKNOWN_BINARY]: "File",
};

async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/files`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }
  return response.json();
}

export function useFileUploader({ onFilesUploaded, onError } = {}) {
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const errors = [];
    const uploadable = files.filter((f) => {
      if (f.size > FILE_CONSTANTS.MAX_FILE_SIZE_BYTES) {
        errors.push(
          `${f.name}: File too large (${formatFileSize(f.size)}). Maximum size is ${formatFileSize(FILE_CONSTANTS.MAX_FILE_SIZE_BYTES)}`
        );
        return false;
      }
      return true;
    });

    setUploading(true);
    setCurrentFile(uploadable.length === 1 ? uploadable[0].name : `${uploadable.length} files`);

    const results = await Promise.allSettled(uploadable.map(uploadFile));
    const uploaded = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        uploaded.push(r.value);
      } else if (r.status === "rejected") {
        errors.push(`${uploadable[i].name}: ${r.reason?.message ?? "Upload failed"}`);
      }
    });

    setUploading(false);
    setCurrentFile(null);

    if (uploaded.length > 0) {
      onFilesUploaded?.(uploaded);
      toast.success(uploaded.length === 1 ? "File uploaded" : `${uploaded.length} files uploaded`);
    }
    if (errors.length > 0) {
      onError?.(errors.join("\n"));
      toast.error("Upload failed", { description: errors[0] });
    }
  }

  return { uploadFiles, uploading, currentFile };
}

export function FilePreviewList({ files, onRemove }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-theme-surface text-theme-text flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <File size={16} />
          <span className="max-w-[200px] truncate">{file.filename}</span>
          <span className="bg-theme-surface-strong text-theme-text-muted rounded px-1.5 py-0.5 text-[10px] font-medium">
            {CATEGORY_LABELS[file.category] ?? "File"}
          </span>
          <span className="text-theme-text-muted text-xs">{file.sizeFormatted}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              aria-label={`Remove ${file.filename || "file"}`}
              className="hover:text-theme-red ml-1 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
