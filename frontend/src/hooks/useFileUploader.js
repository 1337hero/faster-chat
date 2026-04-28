import { useState } from "preact/hooks";
import { FILE_CONSTANTS, formatFileSize } from "@faster-chat/shared";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

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
