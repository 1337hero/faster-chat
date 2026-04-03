import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMemoryStatus, useUserMemories } from "@/hooks/useMemoryStatus";
import { useAuthState } from "@/state/useAuthState";
import { memoryKeys } from "@/hooks/queryKeys";
import { Switch } from "@/components/ui/Switch";
import { Brain, Trash2 } from "lucide-preact";

const MemorySection = () => {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: status } = useMemoryStatus();
  const { data: memoriesData } = useUserMemories(!!status?.globalEnabled && !!status?.enabled);

  const toggleMutation = useMutation({
    mutationFn: (enabled) =>
      apiFetch("/api/memory/enabled", { method: "PUT", body: JSON.stringify({ enabled }) }),
    onMutate: async (enabled) => {
      const queryKey = memoryKeys.status(userId);
      await queryClient.cancelQueries({ queryKey });
      const previousStatus = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (current) =>
        current ? { ...current, enabled } : current
      );

      return { previousStatus, queryKey };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(context.queryKey, context.previousStatus);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.status(userId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (memoryId) => apiFetch(`/api/memory/${memoryId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.memories(userId) });
      queryClient.invalidateQueries({ queryKey: memoryKeys.status(userId) });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiFetch("/api/memory", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.memories(userId) });
      queryClient.invalidateQueries({ queryKey: memoryKeys.status(userId) });
      setConfirmClear(false);
    },
  });

  if (!status?.globalEnabled) {
    return (
      <div className="border-theme-surface bg-theme-canvas-alt rounded-lg border p-6">
        <div className="mb-2 flex items-center gap-2">
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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-theme-text-muted" />
          <h2 className="text-theme-text text-lg font-semibold">Memory</h2>
          {status?.memoriesCount > 0 && (
            <span className="bg-theme-blue/10 text-theme-blue rounded-full px-2 py-0.5 text-xs font-medium">
              {status.memoriesCount}
            </span>
          )}
        </div>
        <Switch
          value={!!status?.enabled}
          onChange={(enabled) => toggleMutation.mutate(enabled)}
          disabled={toggleMutation.isPending}
          aria-label="Enable memory"
        />
      </div>

      <p className="text-theme-text-muted mb-4 text-sm">
        When enabled, the AI remembers facts about you across conversations.
      </p>

      {status?.enabled && (
        <>
          {memories.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-theme-text text-sm font-medium">What the AI remembers</h3>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="group bg-theme-canvas hover:bg-theme-surface/50 ease-snappy flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-75">
                    <span className="text-theme-text">{memory.fact}</span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(memory.id)}
                      disabled={deleteMutation.isPending}
                      className="text-theme-text-muted hover:text-theme-red ease-snappy ml-2 shrink-0 opacity-0 transition-opacity duration-75 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {memories.length === 0 && status?.memoriesCount === 0 && (
            <p className="text-theme-text-muted mb-4 text-sm">
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
