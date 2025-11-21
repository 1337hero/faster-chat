import { useState } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "preact/compat";
import { providersClient } from "@/lib/providersClient";
import { Button } from "@/components/ui/button";

// Lazy load modal component - only load when needed
const AddProviderModal = lazy(() => import("./AddProviderModal"));

const ConnectionsTab = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
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
        <div className="text-latte-subtext0 dark:text-macchiato-subtext0">
          Loading connections...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-latte-red dark:text-macchiato-red">
          Error loading connections: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-latte-surface0 dark:border-macchiato-surface0 flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
            API Connections
          </h2>
          <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-1 text-sm">
            Manage AI provider connections and API keys
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} color="blue">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Connection
        </Button>
      </div>

      {/* Provider list */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {providers.length === 0 && (
            <div className="border-latte-surface1 dark:border-macchiato-surface1 rounded-lg border-2 border-dashed p-12 text-center">
              <svg
                className="text-latte-subtext0 dark:text-macchiato-subtext0 mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <h3 className="text-latte-text dark:text-macchiato-text mt-4 text-lg font-medium">
                No connections yet
              </h3>
              <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 text-sm">
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
              className="border-latte-surface1 bg-latte-mantle dark:border-macchiato-surface1 dark:bg-macchiato-mantle rounded-lg border p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
                      {provider.display_name}
                    </h3>
                    {provider.enabled ? (
                      <span className="bg-latte-green/10 text-latte-green dark:bg-macchiato-green/10 dark:text-macchiato-green inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
                        Enabled
                      </span>
                    ) : (
                      <span className="bg-latte-overlay0/10 text-latte-overlay0 dark:bg-macchiato-overlay0/10 dark:text-macchiato-overlay0 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-sm">
                    {provider.masked_key && (
                      <div className="text-latte-subtext0 dark:text-macchiato-subtext0 flex items-center gap-2">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          />
                        </svg>
                        API Key: {provider.masked_key}
                      </div>
                    )}

                    {provider.base_url && (
                      <div className="text-latte-subtext0 dark:text-macchiato-subtext0 flex items-center gap-2">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        URL: {provider.base_url}
                      </div>
                    )}

                    <div className="text-latte-subtext0 dark:text-macchiato-subtext0 flex items-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      {provider.model_count} {provider.model_count === 1 ? "model" : "models"}{" "}
                      available
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshMutation.mutate(provider.id)}
                    disabled={refreshMutation.isPending}
                    className="text-latte-subtext0 hover:bg-latte-surface0 hover:text-latte-text dark:text-macchiato-subtext0 dark:hover:bg-macchiato-surface0 dark:hover:text-macchiato-text rounded-lg p-2 disabled:opacity-50"
                    title="Refresh models">
                    <svg
                      className={`h-5 w-5 ${refreshMutation.isPending ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        providerId: provider.id,
                        enabled: !provider.enabled,
                      })
                    }
                    disabled={toggleMutation.isPending}
                    className="text-latte-subtext0 hover:bg-latte-surface0 hover:text-latte-text dark:text-macchiato-subtext0 dark:hover:bg-macchiato-surface0 dark:hover:text-macchiato-text rounded-lg p-2 disabled:opacity-50"
                    title={provider.enabled ? "Disable" : "Enable"}>
                    {provider.enabled ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
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
                    className="text-latte-red hover:bg-latte-red/10 dark:text-macchiato-red dark:hover:bg-macchiato-red/10 rounded-lg p-2 disabled:opacity-50"
                    title="Delete connection">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
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
    </div>
  );
};

export default ConnectionsTab;
