import { FILE_CATEGORIES } from "@faster-chat/shared";
import { X, File } from "lucide-preact";

const CATEGORY_LABELS = {
  [FILE_CATEGORIES.IMAGE]: "Image",
  [FILE_CATEGORIES.PDF]: "PDF",
  [FILE_CATEGORIES.TEXT_LIKE]: "Text",
  [FILE_CATEGORIES.OFFICE_MODERN]: "Office",
  [FILE_CATEGORIES.OFFICE_LEGACY]: "Office",
  [FILE_CATEGORIES.UNKNOWN_BINARY]: "File",
};

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
