import { useState, useEffect, useRef } from "preact/hooks";
import { Download, CheckCircle, AlertCircle, Loader } from "lucide-preact";
import Modal from "@/components/ui/Modal";
import { API_BASE } from "@/lib/api";

const PullModelModal = ({ isOpen, onClose, provider, onSuccess }) => {
  const [modelName, setModelName] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  const isComplete = progress?.percentage === 100;

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const handleClose = () => {
    if (isPulling) return;
    resetState();
    onClose();
  };

  const resetState = () => {
    setModelName("");
    setIsPulling(false);
    setProgress(null);
    setError(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!modelName.trim() || isPulling) return;

    setIsPulling(true);
    setProgress({ status: "Initiating pull...", percentage: 0 });
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/admin/models/ollama/pull`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId: provider.id,
          modelName: modelName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start model pull");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.status === "error") {
                setError(data.error || "An error occurred during pull");
                setIsPulling(false);
                break;
              }

              if (data.status === "completed" || data.status === "success") {
                setProgress({ status: "Model pulled successfully!", percentage: 100 });
                setIsPulling(false);

                if (onSuccess) {
                  setTimeout(() => {
                    onSuccess();
                  }, 1500);
                }
                break;
              }

              if (data.total && data.completed !== undefined) {
                const percentage = Math.round((data.completed / data.total) * 100);
                setProgress({
                  status: data.status || "Downloading...",
                  percentage,
                  completed: data.completed,
                  total: data.total,
                });
              } else {
                setProgress({
                  status: data.status || "Processing...",
                  percentage: progress?.percentage || 0,
                });
              }
            } catch (parseError) {
              console.error("Failed to parse SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error("Pull model error:", err);
      setError(err.message || "Failed to pull model");
      setIsPulling(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pull Ollama Model">
      <div className="bg-theme-canvas-alt border-theme-surface mb-4 rounded-lg border p-3">
        <p className="text-theme-text-muted text-sm">
          Provider: <span className="text-theme-text font-medium">{provider?.display_name}</span>
        </p>
        <p className="text-theme-text-muted mt-1 text-xs">{provider?.base_url}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="modelName" className="text-theme-text mb-2 block text-sm font-medium">
            Model Name
          </label>
          <input
            id="modelName"
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g., llama3.2, codellama:7b, mistral"
            disabled={isPulling}
            autoFocus
            className="border-theme-surface bg-theme-canvas text-theme-text placeholder:text-theme-text-muted focus:border-theme-blue focus:ring-theme-blue w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none disabled:opacity-50"
          />
          <p className="text-theme-text-muted mt-1 text-xs">
            Enter the model name from{" "}
            <a
              href="https://ollama.com/library"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-blue hover:underline">
              ollama.com/library
            </a>
          </p>
        </div>

        {progress && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-theme-text text-sm font-medium">{progress.status}</span>
              {progress.percentage !== undefined && (
                <span className="text-theme-text-muted text-sm">{progress.percentage}%</span>
              )}
            </div>
            {progress.percentage !== undefined && (
              <div className="bg-theme-surface h-2 overflow-hidden rounded-full">
                <div
                  className="bg-theme-blue h-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            )}
            {progress.completed !== undefined && progress.total !== undefined && (
              <p className="text-theme-text-muted mt-1 text-xs">
                {formatBytes(progress.completed)} / {formatBytes(progress.total)}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-theme-red/10 border-theme-red/50 text-theme-red mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isComplete && (
          <div className="bg-theme-green/10 border-theme-green/50 text-theme-green mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>Model pulled successfully!</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPulling}
            className="text-theme-text-muted hover:bg-theme-surface flex-1 rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50">
            {isComplete ? "Close" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isPulling || !modelName.trim() || isComplete}
            className="bg-theme-blue hover:bg-theme-blue/90 disabled:bg-theme-blue/50 flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed">
            {isPulling ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Pulling...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Pull Model
              </>
            )}
          </button>
        </div>
      </form>

      {!isPulling && !isComplete && (
        <div className="bg-theme-canvas-alt border-theme-surface mt-4 rounded-lg border p-3">
          <p className="text-theme-text-muted text-xs">
            <strong className="text-theme-text">Note:</strong> Large models may take several minutes
            to download. You can continue using the app while the download is in progress.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default PullModelModal;
