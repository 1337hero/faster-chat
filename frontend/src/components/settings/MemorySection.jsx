import { useState } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Brain, Trash2 } from "lucide-preact";

const MemorySection = () => {
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["memory-status"],
    queryFn: () => apiFetch("/api/memory/status"),
  });

  const { data: memoriesData } = useQuery({
    queryKey: ["user-memories"],
    queryFn: () => apiFetch("/api/memory"),
    enabled: !!status?.globalEnabled && !!status?.enabled,
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled) =>
      apiFetch("/api/memory/enabled", { method: "PUT", body: JSON.stringify({ enabled }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-status"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (memoryId) =>
      apiFetch(`/api/memory/${memoryId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-status"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiFetch("/api/memory", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-status"] });
      setConfirmClear(false);
    },
  });

  if (!status?.globalEnabled) {
    return (
      <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={20} className="text-theme-text-muted" />
          <h2 className="text-theme-text text-lg font-semibold">Memory</h2>
        </div>
        <p className="text-theme-text-muted text-sm">
          Memory is not enabled. Ask your admin to enable cross-conversation memory.
        </p>
      </div>
    );
  }

  const memories = memoriesData?.memories || [];

  return (
    <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-theme-text-muted" />
          <h2 className="text-theme-text text-lg font-semibold">Memory</h2>
          {status?.memoriesCount > 0 && (
            <span className="bg-theme-blue/10 text-theme-blue rounded-full px-2 py-0.5 text-xs font-medium">
              {status.memoriesCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleMutation.mutate(!status?.enabled)}
          disabled={toggleMutation.isPending}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-snappy focus:outline-none ${
            status?.enabled ? "bg-theme-blue" : "bg-theme-surface-strong"
          }`}>
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-snappy ${
              status?.enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <p className="text-theme-text-muted mb-4 text-sm">
        When enabled, the AI remembers facts about you across conversations.
      </p>

      {status?.enabled && (
        <>
          {memories.length > 0 && (
            <div className="space-y-2 mb-4">
              <h3 className="text-theme-text text-sm font-medium">What the AI remembers</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="group flex items-center justify-between rounded-md px-3 py-2 text-sm bg-theme-canvas hover:bg-theme-surface/50 transition-colors duration-75 ease-snappy">
                    <span className="text-theme-text">{memory.fact}</span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(memory.id)}
                      disabled={deleteMutation.isPending}
                      className="text-theme-text-muted hover:text-theme-red opacity-0 group-hover:opacity-100 transition-opacity duration-75 ease-snappy shrink-0 ml-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {memories.length === 0 && status?.memoriesCount === 0 && (
            <p className="text-theme-text-muted text-sm mb-4">
              No memories yet. The AI will start remembering as you chat.
            </p>
          )}

          {memories.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex items-center gap-3">
                  <p className="text-theme-text-muted text-sm">
                    This will permanently delete all memories.
                  </p>
                  <button
                    type="button"
                    onClick={() => clearMutation.mutate()}
                    disabled={clearMutation.isPending}
                    className="text-theme-red hover:text-theme-red/80 text-sm font-medium transition-colors">
                    {clearMutation.isPending ? "Clearing..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-theme-text-muted hover:text-theme-text text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-theme-red/70 hover:text-theme-red text-sm font-medium transition-colors">
                  Clear all memories
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemorySection;
