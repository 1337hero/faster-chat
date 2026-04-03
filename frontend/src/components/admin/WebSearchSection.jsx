import { useState } from "preact/hooks";
import { Check } from "lucide-preact";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { ICON_SIZE, UI_CONSTANTS } from "@faster-chat/shared";

const inputClass =
  "border-theme-surface-strong bg-theme-canvas text-theme-text placeholder-theme-text-muted focus:border-theme-blue w-full rounded-lg border px-4 py-2 text-sm focus:outline-none";

const WebSearchSection = () => {
  const queryClient = useQueryClient();
  const { data: searchConfig } = useQuery({
    queryKey: ["web-search-config"],
    queryFn: () => apiFetch("/api/settings/web-search"),
  });
  const [braveKey, setBraveKey] = useState("");
  const [braveStatus, setBraveStatus] = useState(null);

  const braveKeyMutation = useMutation({
    mutationFn: (apiKey) =>
      apiFetch("/api/settings/web-search", { method: "PUT", body: JSON.stringify({ apiKey }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-search-config"] });
      setBraveKey("");
      setBraveStatus("success");
      setTimeout(() => setBraveStatus(null), UI_CONSTANTS.SUCCESS_MESSAGE_DURATION_MS);
    },
    onError: () => setBraveStatus("error"),
  });

  return (
    <section>
      <h3 className="text-theme-text mb-1 text-sm font-semibold">Web Search</h3>
      <p className="text-theme-text-muted mb-4 text-sm">
        Brave Search API key for web search in conversations.
      </p>
      <div className="bg-theme-canvas-alt border-theme-surface space-y-4 rounded-lg border p-4">
        <div>
          <label htmlFor="braveKey" className="text-theme-text mb-2 block text-sm font-medium">
            Brave API Key
          </label>
          <div className="flex gap-2">
            <input
              id="braveKey"
              type="password"
              value={braveKey}
              onInput={(e) => setBraveKey(e.target.value)}
              placeholder={searchConfig?.apiKey ? "••••••••••••••••" : "Enter Brave API key"}
              className={inputClass}
            />
            <Button
              onClick={() => braveKeyMutation.mutate(braveKey)}
              disabled={!braveKey || braveKeyMutation.isPending}
              color="blue">
              {braveKeyMutation.isPending ? (
                "Saving..."
              ) : braveStatus === "success" ? (
                <>
                  <Check size={ICON_SIZE.MD} className="mr-1" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {searchConfig?.apiKey && (
            <div className="mt-1 flex items-center justify-between">
              <p className="text-theme-text-muted text-xs">
                Key configured ({searchConfig.apiKey}). Enter a new one to replace it.
              </p>
              <button
                type="button"
                onClick={() => braveKeyMutation.mutate("")}
                disabled={braveKeyMutation.isPending}
                className="text-theme-red/70 hover:text-theme-red text-xs font-medium transition-colors">
                Remove
              </button>
            </div>
          )}
          {braveStatus === "error" && (
            <p className="text-theme-red mt-1 text-xs">Failed to save key.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default WebSearchSection;
