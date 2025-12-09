import { useState, useRef, useEffect } from "preact/hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Server,
  Star,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  X,
  Eye,
  Wrench,
  Brain,
  AlertTriangle,
  Database,
  Download,
} from "lucide-preact";
import { formatPrice, formatContextWindow } from "@faster-chat/shared";
import { providersClient } from "@/lib/providersClient";
import { Switch } from "@/components/ui/Switch";
import ProviderLogo from "@/components/ui/ProviderLogo";
import PullModelModal from "@/components/admin/PullModelModal";

const ModelsTab = () => {
  const queryClient = useQueryClient();
  const [expandedProviders, setExpandedProviders] = useState({});
  const [editingModelId, setEditingModelId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef(null);
  const [bulkPendingProviderId, setBulkPendingProviderId] = useState(null);
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Fetch all models
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "models"],
    queryFn: () => providersClient.getAllModels(),
  });

  // Fetch providers to get full provider details (for base_url in pull modal)
  const { data: providersData } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: () => providersClient.getProviders(),
  });

  const models = data?.models || [];
  const providers = providersData?.providers || [];

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    const provider = model.provider_display_name || model.provider;
    if (!acc[provider]) {
      acc[provider] = {
        displayName: provider,
        providerId: model.provider_name || model.provider?.toLowerCase(),
        providerDbId: model.provider_id,
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

  const bulkToggleMutation = useMutation({
    mutationFn: ({ providerId, enabled }) =>
      providersClient.setAllModelsEnabled(providerId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    },
    onMutate: ({ providerId }) => {
      setBulkPendingProviderId(providerId);
    },
    onSettled: () => {
      setBulkPendingProviderId(null);
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

  const handlePullModel = (providerDbId) => {
    // Find full provider details from providers list
    const provider = providers.find((p) => p.id === providerDbId);
    if (provider) {
      setSelectedProvider(provider);
      setPullModalOpen(true);
    }
  };

  const handlePullSuccess = async () => {
    // Sync with Ollama to pick up the new model, then refresh the UI
    if (selectedProvider?.id) {
      try {
        await providersClient.refreshModels(selectedProvider.id);
      } catch (err) {
        console.error("Failed to refresh models after pull:", err);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });

    // Close modal after a brief delay to show success
    setTimeout(() => {
      setPullModalOpen(false);
      setSelectedProvider(null);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-text-muted">Loading models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-theme-red">Error loading models: {error.message}</div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-theme-surface flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-theme-text text-lg font-semibold">Available Models</h2>
            <p className="text-theme-text-muted mt-1 text-sm">
              Enable or disable models for use in chat
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Server className="text-theme-text-muted mx-auto h-12 w-12" />
            <h3 className="text-theme-text mt-4 text-lg font-medium">No models available</h3>
            <p className="text-theme-text-muted mt-2 text-sm">
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
      <div className="border-theme-surface flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-theme-text text-lg font-semibold">Available Models</h2>
          <p className="text-theme-text-muted mt-1 text-sm">
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

            return (
              <div key={provider}>
                <button
                  onClick={() => toggleProvider(provider)}
                  className="text-theme-text-muted hover:text-theme-text mb-3 flex w-full items-center gap-2 text-left text-sm font-semibold tracking-wide uppercase transition-colors">
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <ProviderLogo
                    providerId={providerData.providerId}
                    displayName={providerData.displayName}
                    size="md"
                  />
                  <span>
                    {providerData.displayName} ({enabledCount}/{providerData.models.length} enabled)
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {/* Show Pull Model button for Ollama providers */}
                    {providerData.providerId === "ollama" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePullModel(providerData.providerDbId);
                        }}
                        className="text-theme-green hover:bg-theme-green/10 flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors">
                        <Download className="h-3 w-3" />
                        Pull Model
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        bulkToggleMutation.mutate({
                          providerId: providerData.providerDbId,
                          enabled: false,
                        });
                      }}
                      disabled={bulkToggleMutation.isPending}
                      data-pending={bulkPendingProviderId === providerData.providerDbId}
                      className={`text-theme-text-muted hover:text-theme-text rounded px-2 py-1 text-[11px] font-medium tracking-wide uppercase transition-colors ${
                        bulkPendingProviderId === providerData.providerDbId ? "opacity-60" : ""
                      }`}>
                      Disable All
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        bulkToggleMutation.mutate({
                          providerId: providerData.providerDbId,
                          enabled: true,
                        });
                      }}
                      disabled={bulkToggleMutation.isPending}
                      data-pending={bulkPendingProviderId === providerData.providerDbId}
                      className={`text-theme-blue hover:bg-theme-blue/10 rounded px-2 py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors ${
                        bulkPendingProviderId === providerData.providerDbId ? "opacity-60" : ""
                      }`}>
                      Enable All
                    </button>
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-2">
                    {providerData.models.map((model) => (
                      <div
                        key={model.id}
                        className={`group rounded-lg border p-4 transition-colors ${
                          model.enabled
                            ? "border-theme-surface-strong bg-theme-canvas-alt"
                            : "border-theme-surface bg-theme-canvas opacity-60"
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
                                    className="border-theme-blue text-theme-text focus:ring-theme-blue rounded border px-2 py-1 text-sm font-semibold focus:ring-2 focus:outline-none"
                                    disabled={updateDisplayNameMutation.isPending}
                                  />
                                  <button
                                    onClick={() => saveEditing(model.id)}
                                    disabled={updateDisplayNameMutation.isPending}
                                    className="text-theme-green hover:bg-theme-green/10 rounded p-1"
                                    title="Save">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={updateDisplayNameMutation.isPending}
                                    className="text-theme-red hover:bg-theme-red/10 rounded p-1"
                                    title="Cancel">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <h4 className="text-theme-text font-semibold">
                                    {model.display_name}
                                  </h4>
                                  <button
                                    onClick={() => startEditing(model)}
                                    className="text-theme-text-muted hover:bg-theme-surface hover:text-theme-text rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                                    title="Edit name">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              {model.is_default && (
                                <span className="bg-theme-blue/10 text-theme-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                                  <Star className="h-3 w-3 fill-current" />
                                  Default
                                </span>
                              )}
                            </div>

                            <div className="text-theme-text-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
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
                                  className="text-theme-green inline-flex items-center gap-1"
                                  title="Supports prompt caching">
                                  <Database className="h-3 w-3" />
                                  Cache: ${model.metadata.cache_read_price_per_1m.toFixed(2)}
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                {!!model.metadata?.supports_reasoning && (
                                  <span
                                    className="bg-theme-mauve/20 text-theme-mauve inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                                    title="Extended thinking / reasoning model">
                                    <Brain className="h-3 w-3" />
                                    Reasoning
                                  </span>
                                )}
                                {!!model.metadata?.supports_vision && (
                                  <span
                                    className="bg-theme-surface inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
                                    title="Supports vision / image inputs">
                                    <Eye className="h-3 w-3" />
                                    Vision
                                  </span>
                                )}
                                {!!model.metadata?.supports_tools && (
                                  <span
                                    className="bg-theme-surface inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
                                    title="Supports function calling / tools">
                                    <Wrench className="h-3 w-3" />
                                    Tools
                                  </span>
                                )}
                                {!!model.metadata?.experimental && (
                                  <span
                                    className="bg-theme-yellow/20 text-theme-yellow inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
                                    title="Experimental model">
                                    <AlertTriangle className="h-3 w-3" />
                                    Experimental
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
                                className="text-theme-blue hover:bg-theme-blue/10 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50">
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

      {/* Pull Model Modal */}
      <PullModelModal
        isOpen={pullModalOpen}
        onClose={() => {
          setPullModalOpen(false);
          setSelectedProvider(null);
        }}
        provider={selectedProvider}
        onSuccess={handlePullSuccess}
      />
    </div>
  );
};

export default ModelsTab;
