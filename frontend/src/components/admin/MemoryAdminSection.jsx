import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/Switch";
import { apiFetch } from "@/lib/api";
import { memoryKeys } from "@/hooks/queryKeys";
import { useAuthState } from "@/state/useAuthState";

const inputClass =
  "border-theme-surface-strong bg-theme-canvas text-theme-text placeholder-theme-text-muted focus:border-theme-blue w-full rounded-lg border px-4 py-2 text-sm focus:outline-none";

const MemoryAdminSection = () => {
  const queryClient = useQueryClient();
  const userId = useAuthState((s) => s.user?.id ?? null);
  const { data: memoryConfig } = useQuery({
    queryKey: memoryKeys.settings(userId),
    queryFn: () => apiFetch("/api/settings/memory"),
  });

  const { data: modelsData } = useQuery({
    queryKey: ["models", "text"],
    queryFn: () => apiFetch("/api/models?type=text"),
  });

  const memoryMutation = useMutation({
    mutationFn: (settings) =>
      apiFetch("/api/settings/memory", { method: "PUT", body: JSON.stringify(settings) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.settings(userId) });
    },
  });

  return (
    <section>
      <h3 className="text-theme-text mb-1 text-sm font-semibold">Cross-Conversation Memory</h3>
      <p className="text-theme-text-muted mb-4 text-sm">
        Allow the AI to remember user preferences and facts across conversations.
      </p>
      <div className="bg-theme-canvas-alt border-theme-surface space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-theme-text text-sm font-medium">Enable Memory</label>
            <p className="text-theme-text-muted text-xs">
              When enabled, the AI extracts and recalls facts about users across chats.
            </p>
          </div>
          <Switch
            value={!!memoryConfig?.globalEnabled}
            onChange={(globalEnabled) => memoryMutation.mutate({ globalEnabled })}
            disabled={memoryMutation.isPending}
            aria-label="Enable memory"
          />
        </div>

        {memoryConfig?.globalEnabled && (
          <div>
            <label className="text-theme-text mb-2 block text-sm font-medium">
              Extraction Model
            </label>
            <select
              value={memoryConfig?.extractionModel || ""}
              onChange={(e) => memoryMutation.mutate({ extractionModel: e.target.value || null })}
              disabled={memoryMutation.isPending}
              className={inputClass}>
              <option value="">Same as conversation model</option>
              {(modelsData?.models || []).map((model) => (
                <option key={model.model_id} value={model.model_id}>
                  {model.display_name}
                </option>
              ))}
            </select>
            <p className="text-theme-text-muted mt-1 text-xs">
              Use a fast, cheap model for memory extraction to minimize cost.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MemoryAdminSection;
