import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useReturnToChat } from "@/hooks/useReturnToChat";
import { useAuthState } from "@/state/useAuthState";
import { useFileDragDrop } from "@/hooks/useFileDragDrop";
import { chatKeys } from "@/hooks/useChatsQuery";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { validateImportFile, importChatGPTConversations } from "@/utils/importConversation";
import { IMPORT_CONSTANTS } from "@faster-chat/shared";

// Sub-component: Drop zone content based on current state
const DropZoneContent = ({ file, validating, validation, onChooseDifferent, onOpenPicker }) => {
  if (validating) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-theme-primary h-16 w-16 animate-spin" />
        <p className="text-theme-text text-base">Validating file...</p>
      </div>
    );
  }

  if (file) {
    const isValid = validation?.valid;
    return (
      <div className="flex flex-col items-center gap-4">
        {isValid ? (
          <CheckCircle className="text-theme-green h-16 w-16" />
        ) : (
          <AlertCircle className="text-theme-red h-16 w-16" />
        )}
        <div>
          <p className="text-theme-text text-base font-medium">{file.name}</p>
          <p className="text-theme-text-muted mt-1 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
        </div>
        {isValid && validation.stats && <ValidationStats stats={validation.stats} />}
        <button
          onClick={onChooseDifferent}
          className="text-theme-primary hover:text-theme-primary-hover mt-2 text-sm font-medium">
          Choose different file
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Upload className="text-theme-text-muted h-16 w-16" />
      <div>
        <p className="text-theme-text text-base font-medium">Drop your ChatGPT export file here</p>
        <p className="text-theme-text-muted mt-2 text-sm">
          or{" "}
          <button
            onClick={onOpenPicker}
            className="text-theme-primary hover:text-theme-primary-hover font-medium">
            browse files
          </button>
        </p>
      </div>
      <p className="text-theme-text-muted mt-2 text-xs">
        Supports ChatGPT JSON export files (up to {IMPORT_CONSTANTS.MAX_FILE_SIZE_MB}MB)
      </p>
    </div>
  );
};

// Sub-component: Validation statistics display
const ValidationStats = ({ stats }) => (
  <div className="bg-theme-canvas text-theme-text border-theme-border mt-2 w-full max-w-md rounded-lg border p-4 text-left">
    <p className="mb-3 font-medium">Found {stats.conversationCount} conversations:</p>
    <ul className="text-theme-text-muted space-y-2 text-sm">
      <li className="flex items-center gap-2">
        <span className="text-theme-accent">•</span>
        {stats.totalMessages} total messages
      </li>
      <li className="flex items-center gap-2">
        <span className="text-theme-accent">•</span>
        {stats.userMessages} user messages
      </li>
      <li className="flex items-center gap-2">
        <span className="text-theme-accent">•</span>
        {stats.assistantMessages} assistant messages
      </li>
    </ul>
  </div>
);

// Sub-component: Import instructions
const ImportInstructions = () => (
  <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
    <h2 className="text-theme-text mb-4 flex items-center gap-2 text-lg font-semibold">
      <FileText size={20} />
      How to export from ChatGPT
    </h2>
    <ol className="text-theme-text-muted space-y-3 text-sm">
      {[
        "Go to ChatGPT Settings → Data Controls",
        'Click "Export data"',
        "Wait for the export email (usually within 24 hours)",
        "Download and extract the ZIP file",
        "Upload the conversations.json file here",
      ].map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-theme-primary font-bold">{i + 1}.</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  </div>
);

// Main Import page component
const Import = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const { returnToChat, isReturning } = useReturnToChat();
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  // Validation mutation
  const validationMutation = useMutation({
    mutationFn: validateImportFile,
    onSuccess: (result) => {
      if (!result.valid) {
        toast.error(result.error);
      }
    },
    onError: () => {
      toast.error("Failed to validate file");
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: importChatGPTConversations,
    onSuccess: (result) => {
      toast.success(
        `Imported ${result.imported.conversations} conversations with ${result.imported.messages} messages`
      );
      queryClient.invalidateQueries(chatKeys.list(userId));
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import conversations");
    },
  });

  // File selection handler
  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    validationMutation.reset();
    importMutation.reset();
    validationMutation.mutate(file);
  };

  // Drag & drop hook
  const { dragActive, fileInputRef, handleDrag, handleDrop, handleFileInput, openFilePicker } =
    useFileDragDrop(handleFileSelect);

  // Reset everything
  const handleReset = () => {
    setSelectedFile(null);
    validationMutation.reset();
    importMutation.reset();
    openFilePicker();
  };

  // Start import
  const handleImport = () => {
    const data = validationMutation.data?.data;
    if (data) {
      importMutation.mutate(data);
    }
  };

  // Derived state
  const validation = validationMutation.data;
  const isValidated = validation?.valid;
  const isImporting = importMutation.isPending;
  const importSucceeded = importMutation.isSuccess;

  return (
    <div className="bg-theme-canvas flex h-full flex-col">
      {/* Header */}
      <div className="border-theme-surface border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-theme-text text-2xl font-semibold">Import Conversations</h1>
            <p className="text-theme-text-muted mt-1 text-sm">
              Import your chat history from ChatGPT or other platforms
            </p>
          </div>
          <button
            type="button"
            onClick={returnToChat}
            disabled={isReturning || isImporting}
            className="text-theme-text hover:text-theme-text border-theme-surface hover:border-theme-surface-strong hover:bg-theme-surface mt-1 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60">
            <LayoutGrid size={16} />
            <span>Return to chat</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Importing Progress Banner */}
          {isImporting && (
            <div className="bg-theme-primary/10 border-theme-primary animate-in fade-in zoom-in-95 flex items-center gap-3 rounded-lg border p-4 duration-200">
              <Loader2 className="text-theme-primary h-5 w-5 flex-shrink-0 animate-spin" />
              <div className="flex-1">
                <p className="text-theme-text font-medium">Importing conversations...</p>
                <p className="text-theme-text-muted mt-1 text-sm">
                  This may take a moment for large exports. Please don't close this page.
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {importSucceeded && (
            <div className="bg-theme-green/10 border-theme-green animate-in fade-in zoom-in-95 flex items-start gap-3 rounded-lg border p-4 duration-200">
              <CheckCircle className="text-theme-green mt-0.5 h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-theme-text font-medium">Import successful!</p>
                <p className="text-theme-text-muted mt-1 text-sm">
                  Imported {importMutation.data.imported.conversations} conversations with{" "}
                  {importMutation.data.imported.messages} messages.
                </p>
              </div>
              <button
                onClick={returnToChat}
                className="text-theme-green hover:text-theme-green/80 text-sm font-medium">
                View Chats →
              </button>
            </div>
          )}

          {/* File Upload Area */}
          <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
            <h2 className="text-theme-text mb-4 text-lg font-semibold">
              {importSucceeded ? "Import Another File" : "Select File"}
            </h2>

            <div
              className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                dragActive
                  ? "border-theme-primary bg-theme-primary/5"
                  : "border-theme-border hover:border-theme-surface-strong"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}>
              <input
                ref={fileInputRef}
                type="file"
                accept={IMPORT_CONSTANTS.SUPPORTED_EXTENSION}
                onChange={handleFileInput}
                className="hidden"
              />

              <DropZoneContent
                file={selectedFile}
                validating={validationMutation.isPending}
                validation={validation}
                onChooseDifferent={handleReset}
                onOpenPicker={openFilePicker}
              />
            </div>

            {/* Import Button */}
            {isValidated && !importSucceeded && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="btn btn-primary flex items-center gap-2 px-6 py-2.5">
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Conversations
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Instructions - only show before import success */}
          {!importSucceeded && <ImportInstructions />}
        </div>
      </div>
    </div>
  );
};

export default Import;
