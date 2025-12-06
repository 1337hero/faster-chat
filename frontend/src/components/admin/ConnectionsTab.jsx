import { useState } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "preact/compat";
import {
  Plus,
  Zap,
  Key,
  Link2,
  Server,
  RefreshCw,
  XCircle,
  CheckCircle,
  Trash2,
  Pencil,
} from "lucide-react";
import { providersClient } from "@/lib/providersClient";
import { Button } from "@/components/ui/button";
import EditProviderModal from "./EditProviderModal";

// Lazy load modal component - only load when needed
const AddProviderModal = lazy(() => import("./AddProviderModal"));

const ConnectionsTab = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const queryClient = useQueryClient();

  // Fetch providers
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: () => providersClient.getProviders(),
  });

  const providers = data?.providers || [];

  // Refresh models mutation
  const refreshMutation = useMutation({
    mutationFn: (providerId) => providersClient.refreshModels(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
  });

  // Toggle enabled mutation
  const toggleMutation = useMutation({
    mutationFn: ({ providerId, enabled }) =>
      providersClient.updateProvider(providerId, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    },
  });

  // Delete provider mutation
  const deleteMutation = useMutation({
    mutationFn: (providerId) => providersClient.deleteProvider(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-text-muted">Loading connections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-red">Error loading connections: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-theme-surface flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-theme-text text-lg font-semibold">API Connections</h2>
          <p className="text-theme-text-muted mt-1 text-sm">
            Manage AI provider connections and API keys
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} color="blue">
          <Plus className="h-5 w-5" />
          Add Connection
        </Button>
      </div>

      {/* Provider list */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {providers.length === 0 && (
            <div className="border-theme-surface-strong rounded-lg border-2 border-dashed p-12 text-center">
              <Zap className="text-theme-text-muted mx-auto h-12 w-12" />
              <h3 className="text-theme-text mt-4 text-lg font-medium">No connections yet</h3>
              <p className="text-theme-text-muted mt-2 text-sm">
                Add your first AI provider to get started
              </p>
              <Button onClick={() => setAddModalOpen(true)} color="blue" className="mt-4">
                Add Connection
              </Button>
            </div>
          )}

          {providers.map((provider) => (
            <div
              key={provider.id}
              className="border-theme-surface-strong bg-theme-canvas-alt rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-theme-text text-lg font-semibold">
                      {provider.display_name}
                    </h3>
                    {provider.enabled ? (
                      <span className="bg-theme-green/10 text-theme-green inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
                        Enabled
                      </span>
                    ) : (
                      <span className="bg-theme-overlay/10 text-theme-overlay inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-sm">
                    {provider.masked_key && (
                      <div className="text-theme-text-muted flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        API Key: {provider.masked_key}
                      </div>
                    )}

                    {provider.base_url && (
                      <div className="text-theme-text-muted flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        URL: {provider.base_url}
                      </div>
                    )}

                    <div className="text-theme-text-muted flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      {provider.model_count} {provider.model_count === 1 ? "model" : "models"}{" "}
                      available
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingProvider(provider)}
                    className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded-lg p-2 disabled:opacity-50"
                    title="Edit API key or base URL">
                    <Pencil className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => refreshMutation.mutate(provider.id)}
                    disabled={refreshMutation.isPending}
                    className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded-lg p-2 disabled:opacity-50"
                    title="Refresh models">
                    <RefreshCw
                      className={`h-5 w-5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                    />
                  </button>

                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        providerId: provider.id,
                        enabled: !provider.enabled,
                      })
                    }
                    disabled={toggleMutation.isPending}
                    className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded-lg p-2 disabled:opacity-50"
                    title={provider.enabled ? "Disable" : "Enable"}>
                    {provider.enabled ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete ${provider.display_name}? This will also delete all associated models.`
                        )
                      ) {
                        deleteMutation.mutate(provider.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-theme-red hover:bg-theme-red/10 rounded-lg p-2 disabled:opacity-50"
                    title="Delete connection">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Provider Modal - wrapped in Suspense for lazy loading */}
      <Suspense fallback={null}>
        {addModalOpen && (
          <AddProviderModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
        )}
      </Suspense>

      {editingProvider && (
        <EditProviderModal
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
        />
      )}
    </div>
  );
};

export default ConnectionsTab;
