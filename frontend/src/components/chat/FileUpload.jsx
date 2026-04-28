import { useState, useRef, useImperativeHandle, forwardRef } from "preact/compat";
import {
  FILE_CATEGORIES,
  FILE_CONSTANTS,
  formatFileSize,
  ATTACHMENT_INPUT_ACCEPT,
} from "@faster-chat/shared";
import { toast } from "sonner";
import { X, File } from "lucide-preact";
import { API_BASE } from "@/lib/api";

/**
 * FileUpload Component
 * Handles file selection and upload with preview
 */
const FileUpload = forwardRef(({ onFilesUploaded, onError, disabled }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const fileInputRef = useRef(null);

  // Expose handleButtonClick to parent via ref
  useImperativeHandle(ref, () => ({
    handleButtonClick: () => {
      fileInputRef.current?.click();
    },
  }));

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setUploading(true);
    setCurrentFile(files.length === 1 ? files[0].name : `${files.length} files`);

    const uploadedFiles = [];
    const errors = [];
    const oversizeMsg = (f) =>
      `${f.name}: File too large (${formatFileSize(f.size)}). Maximum size is ${formatFileSize(FILE_CONSTANTS.MAX_FILE_SIZE_BYTES)}`;

    const uploadable = [];
    for (const file of files) {
      if (file.size > FILE_CONSTANTS.MAX_FILE_SIZE_BYTES) {
        errors.push(oversizeMsg(file));
      } else {
        uploadable.push(file);
      }
    }

    const results = await Promise.allSettled(uploadable.map(uploadFile));
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) {
        uploadedFiles.push(r.value);
      } else if (r.status === "rejected") {
        errors.push(`${uploadable[i].name}: ${r.reason?.message ?? "Upload failed"}`);
      }
    });

    setUploading(false);
    setCurrentFile(null);
    if (uploadedFiles.length > 0) {
      onFilesUploaded?.(uploadedFiles);
      const fileCount = uploadedFiles.length;
      toast.success(fileCount === 1 ? "File uploaded" : `${fileCount} files uploaded`);
    }

    if (errors.length > 0) {
      onError?.(errors.join("\n"));
      toast.error("Upload failed", { description: errors[0] });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        accept={ATTACHMENT_INPUT_ACCEPT}
      />

      {uploading && currentFile && (
        <div className="text-theme-text-muted mb-2 text-xs">Uploading {currentFile}...</div>
      )}
    </>
  );
});

FileUpload.displayName = "FileUpload";

/**
 * FilePreview Component
 * Shows selected files before sending
 */
export function FilePreviewList({ files, onRemove }) {
  if (!files || files.length === 0) {
    return null;
  }

  const getCategoryLabel = (mimeType) => {
    if (mimeType?.startsWith("image/")) return "Image";
    if (mimeType === "application/pdf") return "PDF";
    if (mimeType?.startsWith("text/")) return "Text";
    if (
      mimeType?.includes("office") ||
      mimeType?.includes("spreadsheet") ||
      mimeType?.includes("presentation")
    )
      return "Office";
    return "File";
  };

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-theme-surface text-theme-text flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <File size={16} />
          <span className="max-w-[200px] truncate">{file.filename}</span>
          <span className="bg-theme-surface-strong text-theme-text-muted rounded px-1.5 py-0.5 text-[10px] font-medium">
            {getCategoryLabel(file.mimeType)}
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

export { FileUpload };
export default FileUpload;
