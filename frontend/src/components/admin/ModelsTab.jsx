import { useState } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";
import { Switch } from "@/components/ui/Switch";

const ModelsTab = () => {
  const queryClient = useQueryClient();

  // Fetch all models
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "models"],
    queryFn: () => providersClient.getAllModels(),
  });

  const models = data?.models || [];

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    const provider = model.provider_display_name || model.provider;
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {});

  // Toggle model enabled
  const toggleMutation = useMutation({
    mutationFn: ({ modelId, enabled }) =>
      providersClient.updateModel(modelId, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
  });

  // Set default model
  const setDefaultMutation = useMutation({
    mutationFn: (modelId) => providersClient.setDefaultModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
  });

  const formatPrice = (price) => {
    if (!price) return "Free";
    return `$${price.toFixed(2)}`;
  };

  const formatContextWindow = (tokens) => {
    if (!tokens) return "Unknown";
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-latte-subtext0 dark:text-macchiato-subtext0">Loading models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-latte-red dark:text-macchiato-red">
          Error loading models: {error.message}
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-latte-surface0 px-6 py-4 dark:border-macchiato-surface0">
          <div>
            <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
              Available Models
            </h2>
            <p className="mt-1 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
              Enable or disable models for use in chat
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-latte-subtext0 dark:text-macchiato-subtext0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-latte-text dark:text-macchiato-text">
              No models available
            </h3>
            <p className="mt-2 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
              Add a provider connection in the Settings tab to fetch models
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-latte-surface0 px-6 py-4 dark:border-macchiato-surface0">
        <div>
          <h2 className="text-lg font-semibold text-latte-text dark:text-macchiato-text">
            Available Models
          </h2>
          <p className="mt-1 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
            {models.filter((m) => m.enabled).length} of {models.length} models enabled
          </p>
        </div>
      </div>

      {/* Models list by provider */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
            <div key={provider}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-latte-subtext0 dark:text-macchiato-subtext0">
                {provider} ({providerModels.length} {providerModels.length === 1 ? "model" : "models"})
              </h3>

              <div className="space-y-2">
                {providerModels.map((model) => (
                  <div
                    key={model.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      model.enabled
                        ? "border-latte-surface1 bg-latte-mantle dark:border-macchiato-surface1 dark:bg-macchiato-mantle"
                        : "border-latte-surface0 bg-latte-base opacity-60 dark:border-macchiato-surface0 dark:bg-macchiato-base"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-latte-text dark:text-macchiato-text">
                            {model.display_name}
                          </h4>
                          {model.is_default && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-latte-blue/10 px-2 py-0.5 text-xs font-medium text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue">
                              <svg
                                className="h-3 w-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Default
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
                          {model.metadata?.context_window && (
                            <span>
                              {formatContextWindow(model.metadata.context_window)} context
                            </span>
                          )}
                          {model.metadata?.input_price_per_1m !== undefined &&
                            model.metadata?.output_price_per_1m !== undefined && (
                              <span title="Input / Output price per 1M tokens">
                                {formatPrice(model.metadata.input_price_per_1m)}/
                                {formatPrice(model.metadata.output_price_per_1m)} per 1M
                              </span>
                            )}
                          {model.metadata?.cache_read_price_per_1m > 0 && (
                            <span
                              className="text-latte-green dark:text-macchiato-green"
                              title="Supports prompt caching"
                            >
                              💾 Cache: ${model.metadata.cache_read_price_per_1m.toFixed(2)}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {model.metadata?.supports_reasoning && (
                              <span
                                className="rounded bg-latte-mauve/20 px-1.5 py-0.5 text-xs font-medium text-latte-mauve dark:bg-macchiato-mauve/20 dark:text-macchiato-mauve"
                                title="Extended thinking / reasoning model"
                              >
                                🧠 Reasoning
                              </span>
                            )}
                            {model.metadata?.supports_vision && (
                              <span
                                className="rounded bg-latte-surface0 px-1.5 py-0.5 text-xs dark:bg-macchiato-surface0"
                                title="Supports vision / image inputs"
                              >
                                👁️ Vision
                              </span>
                            )}
                            {model.metadata?.supports_tools && (
                              <span
                                className="rounded bg-latte-surface0 px-1.5 py-0.5 text-xs dark:bg-macchiato-surface0"
                                title="Supports function calling / tools"
                              >
                                🔧 Tools
                              </span>
                            )}
                            {model.metadata?.experimental && (
                              <span
                                className="rounded bg-latte-yellow/20 px-1.5 py-0.5 text-xs font-medium text-latte-yellow dark:bg-macchiato-yellow/20 dark:text-macchiato-yellow"
                                title="Experimental model"
                              >
                                ⚠️ Experimental
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!model.is_default && model.enabled && (
                          <button
                            onClick={() => setDefaultMutation.mutate(model.id)}
                            disabled={setDefaultMutation.isPending}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-latte-blue hover:bg-latte-blue/10 disabled:opacity-50 dark:text-macchiato-blue dark:hover:bg-macchiato-blue/10"
                          >
                            Set Default
                          </button>
                        )}

                        <Switch
                          color="blue"
                          value={model.enabled}
                          onChange={(enabled) =>
                            toggleMutation.mutate({
                              modelId: model.id,
                              enabled,
                            })
                          }
                          disabled={toggleMutation.isPending}
                          title={model.enabled ? "Disable model" : "Enable model"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelsTab;
