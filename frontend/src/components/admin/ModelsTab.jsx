import { useState, useRef, useEffect } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server, Star, ChevronDown, ChevronRight, Pencil, Check, X } from "lucide-react";
import { providersClient } from "@/lib/providersClient";
import { getProviderLogoUrl, getProviderBranding } from "@/lib/providerUtils";
import { Switch } from "@/components/ui/Switch";

const ModelsTab = () => {
  const queryClient = useQueryClient();
  const [expandedProviders, setExpandedProviders] = useState({});
  const [editingModelId, setEditingModelId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef(null);

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
      acc[provider] = {
        displayName: provider,
        providerId: model.provider_name || model.provider?.toLowerCase(),
        models: [],
      };
    }
    acc[provider].models.push(model);
    return acc;
  }, {});

  // Initialize expanded state (all collapsed by default for long lists)
  const toggleProvider = (provider) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  const isExpanded = (provider) => expandedProviders[provider] ?? false;

  // Toggle model enabled
  const toggleMutation = useMutation({
    mutationFn: ({ modelId, enabled }) => providersClient.updateModel(modelId, { enabled }),
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

  // Update model display name
  const updateDisplayNameMutation = useMutation({
    mutationFn: ({ modelId, displayName }) => providersClient.updateModel(modelId, { displayName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      setEditingModelId(null);
      setEditingName("");
    },
  });

  // Focus input when editing starts
  useEffect(() => {
    if (editingModelId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingModelId]);

  const startEditing = (model) => {
    setEditingModelId(model.id);
    setEditingName(model.display_name);
  };

  const cancelEditing = () => {
    setEditingModelId(null);
    setEditingName("");
  };

  const saveEditing = (modelId) => {
    if (editingName.trim()) {
      updateDisplayNameMutation.mutate({ modelId, displayName: editingName.trim() });
    } else {
      cancelEditing();
    }
  };

  const handleKeyDown = (e, modelId) => {
    if (e.key === "Enter") {
      saveEditing(modelId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

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
        <div className="border-latte-surface0 dark:border-macchiato-surface0 flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
              Available Models
            </h2>
            <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-1 text-sm">
              Enable or disable models for use in chat
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Server className="text-latte-subtext0 dark:text-macchiato-subtext0 mx-auto h-12 w-12" />
            <h3 className="text-latte-text dark:text-macchiato-text mt-4 text-lg font-medium">
              No models available
            </h3>
            <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 text-sm">
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
      <div className="border-latte-surface0 dark:border-macchiato-surface0 flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-latte-text dark:text-macchiato-text text-lg font-semibold">
            Available Models
          </h2>
          <p className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-1 text-sm">
            {models.filter((m) => m.enabled).length} of {models.length} models enabled
          </p>
        </div>
      </div>

      {/* Models list by provider */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {Object.entries(modelsByProvider).map(([provider, providerData]) => {
            const expanded = isExpanded(provider);
            const enabledCount = providerData.models.filter((m) => m.enabled).length;
            const logoUrl = getProviderLogoUrl(providerData.providerId);
            const branding = getProviderBranding(providerData.providerId);

            return (
              <div key={provider}>
                <button
                  onClick={() => toggleProvider(provider)}
                  className="text-latte-subtext0 hover:text-latte-text dark:text-macchiato-subtext0 dark:hover:text-macchiato-text mb-3 flex w-full items-center gap-2 text-left text-sm font-semibold uppercase tracking-wide transition-colors">
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md ${
                      branding.className ||
                      "from-latte-blue/10 to-latte-mauve/10 dark:from-macchiato-blue/20 dark:to-macchiato-mauve/20 bg-gradient-to-br"
                    }`}
                    style={branding.style}>
                    <img
                      src={logoUrl}
                      alt={`${providerData.displayName} logo`}
                      className="h-4 w-4 dark:brightness-90 dark:invert"
                      onError={(e) => {
                        e.target.parentElement.style.display = "none";
                      }}
                    />
                  </div>
                  <span>
                    {providerData.displayName} ({enabledCount}/{providerData.models.length} enabled)
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-2">
                    {providerData.models.map((model) => (
                      <div
                        key={model.id}
                        className={`group rounded-lg border p-4 transition-colors ${
                          model.enabled
                            ? "border-latte-surface1 bg-latte-mantle dark:border-macchiato-surface1 dark:bg-macchiato-mantle"
                            : "border-latte-surface0 bg-latte-base dark:border-macchiato-surface0 dark:bg-macchiato-base opacity-60"
                        }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {editingModelId === model.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={inputRef}
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, model.id)}
                                    onBlur={() => saveEditing(model.id)}
                                    className="border-latte-blue text-latte-text focus:ring-latte-blue dark:border-macchiato-blue dark:bg-macchiato-base dark:text-macchiato-text dark:focus:ring-macchiato-blue rounded border px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2"
                                    disabled={updateDisplayNameMutation.isPending}
                                  />
                                  <button
                                    onClick={() => saveEditing(model.id)}
                                    disabled={updateDisplayNameMutation.isPending}
                                    className="text-latte-green hover:bg-latte-green/10 dark:text-macchiato-green dark:hover:bg-macchiato-green/10 rounded p-1"
                                    title="Save">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={updateDisplayNameMutation.isPending}
                                    className="text-latte-red hover:bg-latte-red/10 dark:text-macchiato-red dark:hover:bg-macchiato-red/10 rounded p-1"
                                    title="Cancel">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <h4 className="text-latte-text dark:text-macchiato-text font-semibold">
                                    {model.display_name}
                                  </h4>
                                  <button
                                    onClick={() => startEditing(model)}
                                    className="text-latte-subtext0 hover:bg-latte-surface0 hover:text-latte-text dark:text-macchiato-subtext0 dark:hover:bg-macchiato-surface0 dark:hover:text-macchiato-text rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                                    title="Edit name">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              {model.is_default && (
                                <span className="bg-latte-blue/10 text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                                  <Star className="h-3 w-3 fill-current" />
                                  Default
                                </span>
                              )}
                            </div>

                            <div className="text-latte-subtext0 dark:text-macchiato-subtext0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
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
                                  title="Supports prompt caching">
                                  💾 Cache: ${model.metadata.cache_read_price_per_1m.toFixed(2)}
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                {model.metadata?.supports_reasoning && (
                                  <span
                                    className="bg-latte-mauve/20 text-latte-mauve dark:bg-macchiato-mauve/20 dark:text-macchiato-mauve rounded px-1.5 py-0.5 text-xs font-medium"
                                    title="Extended thinking / reasoning model">
                                    🧠 Reasoning
                                  </span>
                                )}
                                {model.metadata?.supports_vision && (
                                  <span
                                    className="bg-latte-surface0 dark:bg-macchiato-surface0 rounded px-1.5 py-0.5 text-xs"
                                    title="Supports vision / image inputs">
                                    👁️ Vision
                                  </span>
                                )}
                                {model.metadata?.supports_tools && (
                                  <span
                                    className="bg-latte-surface0 dark:bg-macchiato-surface0 rounded px-1.5 py-0.5 text-xs"
                                    title="Supports function calling / tools">
                                    🔧 Tools
                                  </span>
                                )}
                                {model.metadata?.experimental && (
                                  <span
                                    className="bg-latte-yellow/20 text-latte-yellow dark:bg-macchiato-yellow/20 dark:text-macchiato-yellow rounded px-1.5 py-0.5 text-xs font-medium"
                                    title="Experimental model">
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
                                className="text-latte-blue hover:bg-latte-blue/10 dark:text-macchiato-blue dark:hover:bg-macchiato-blue/10 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50">
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModelsTab;
