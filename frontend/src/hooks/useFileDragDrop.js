import { useState, useRef } from "preact/hooks";

/**
 * Hook for file drag & drop functionality
 * Returns state and handlers for a drop zone
 */
export const useFileDragDrop = (onFileSelect) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onFileSelect(file);
    }
  };

  const handleFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileSelect(file);
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return {
    dragActive,
    fileInputRef,
    handleDrag,
    handleDrop,
    handleFileInput,
    openFilePicker,
  };
};
