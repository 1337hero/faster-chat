import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

const EditProviderModal = ({ provider, onClose }) => {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(provider.base_url || "");
  const [error, setError] = useState("");

  const updateMutation = useMutation({
    mutationFn: () =>
      providersClient.updateProvider(provider.id, {
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      onClose();
      setApiKey("");
      setError("");
    },
    onError: (err) => {
      const message = err?.message || "Failed to update provider";
      setError(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!apiKey && baseUrl === provider.base_url) {
      setError("Enter a new API key or update the base URL.");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Modal isOpen={!!provider} onClose={onClose} title={`Update ${provider.display_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-theme-text block text-sm font-medium">API Key</label>
          <input
            type="password"
            value={apiKey}
            onInput={(e) => setApiKey(e.target.value)}
            placeholder="New API key"
            autoComplete="new-password"
            className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
          />
          <p className="text-theme-text-muted mt-1 text-xs">
            Current key: {provider.masked_key || "Not set"}
          </p>
        </div>

        <div>
          <label className="text-theme-text block text-sm font-medium">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onInput={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
          />
        </div>

        {error && (
          <div className="bg-theme-red/10 text-theme-red rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" plain onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" color="blue" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProviderModal;
