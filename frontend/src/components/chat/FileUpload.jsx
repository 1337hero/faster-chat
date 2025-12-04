import { useState, useRef, useImperativeHandle, forwardRef } from "preact/compat";
import { FILE_CONSTANTS, formatFileSize } from "@faster-chat/shared";
import { X, File } from "lucide-react";

const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

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
    if (files.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      if (file.size > FILE_CONSTANTS.MAX_FILE_SIZE_BYTES) {
        errors.push(
          `${file.name}: File too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(FILE_CONSTANTS.MAX_FILE_SIZE_BYTES)}`
        );
        continue;
      }

      try {
        setCurrentFile(file.name);

        const uploadedFile = await uploadFile(file);

        if (uploadedFile) {
          uploadedFiles.push(uploadedFile);
        }
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
    setCurrentFile(null);
    if (uploadedFiles.length > 0) {
      onFilesUploaded?.(uploadedFiles);
    }

    if (errors.length > 0) {
      onError?.(errors.join("\n"));
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
        accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.json,.md,.csv"
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
  if (!files || files.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-theme-surface text-theme-text flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
          <File size={16} />
          <span className="max-w-[200px] truncate">{file.filename}</span>
          <span className="text-theme-text-muted text-xs">{file.sizeFormatted}</span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(file.id)}
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
