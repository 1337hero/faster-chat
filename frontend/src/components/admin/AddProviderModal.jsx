import { useState } from "preact/hooks";
import {
  categorizeProvider,
  getProviderType,
  isLocalProvider,
  getProviderBaseUrl,
  CACHE_DURATIONS,
} from "@faster-chat/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import ProviderBadge from "@/components/ui/ProviderBadge";

const AddProviderModal = ({ isOpen, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();

  // Fetch available providers from models.dev
  const { data: providersData, isLoading: isLoadingProviders } = useQuery({
    queryKey: ["available-providers"],
    queryFn: () => providersClient.getAvailableProviders(),
    staleTime: CACHE_DURATIONS.PROVIDER_LIST,
  });

  const availableProviders = providersData?.providers || [];

  // Filter and group providers
  const filteredProviders = searchTerm
    ? availableProviders.filter(
        (p) =>
          (p.name || p.displayName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.displayName || p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableProviders;

  const resolveCategory = (provider) =>
    provider.category || categorizeProvider(provider.id || provider.name || "");

  const groupedProviders = filteredProviders.reduce(
    (groups, provider) => {
      const category = resolveCategory(provider);
      if (category === "local") {
        groups.local.push(provider);
        return groups;
      }
      if (category === "official") {
        groups.official.push(provider);
        return groups;
      }
      groups.community.push(provider);
      return groups;
    },
    { local: [], official: [], community: [] }
  );

  const createMutation = useMutation({
    mutationFn: () => {
      // For local providers, use dummy API key if not provided
      const isLocal = isLocalProvider(selectedProvider.id, selectedProvider);
      const finalApiKey = isLocal && !apiKey ? "local" : apiKey;
      const finalBaseUrl = baseUrl || null;
      const providerType = getProviderType(selectedProvider.id, selectedProvider);

      return providersClient.createProvider(
        selectedProvider.id,
        displayName || selectedProvider.displayName || selectedProvider.name,
        providerType,
        finalBaseUrl,
        finalApiKey
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      onClose();
      // Reset form
      setSelectedProvider(null);
      setDisplayName("");
      setBaseUrl("");
      setApiKey("");
      setError("");
      setSearchTerm("");
    },
    onError: (error) => {
      console.error("Create provider error:", error);
      let errorMsg = error.message;
      if (error.response?.details) {
        errorMsg += "\n" + JSON.stringify(error.response.details, null, 2);
      }
      setError(errorMsg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!selectedProvider) {
      setError("Please select a provider");
      return;
    }

    // Validate API key if required
    const isLocal = isLocalProvider(selectedProvider.id, selectedProvider);
    if (!isLocal && !apiKey && selectedProvider.requiresApiKey !== false) {
      setError("API key is required");
      return;
    }

    // Validate base URL if required
    if ((selectedProvider.requiresBaseUrl || isLocal) && !baseUrl) {
      setError(`${selectedProvider.baseUrlLabel || "Base URL"} is required`);
      return;
    }

    createMutation.mutate();
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setDisplayName(provider.displayName || provider.name);
    const defaultUrl = getProviderBaseUrl(provider, import.meta.env.DEV);
    if (defaultUrl) {
      setBaseUrl(defaultUrl);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Connection">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!selectedProvider ? (
          <>
            {/* Search bar */}
            <div>
              <input
                type="text"
                value={searchTerm}
                onInput={(e) => setSearchTerm(e.target.value)}
                placeholder="Search providers..."
                className="border-theme-surface-strong bg-theme-canvas text-theme-text placeholder-theme-text-muted focus:border-theme-blue w-full rounded-lg border px-4 py-2 focus:outline-none"
              />
            </div>

            {isLoadingProviders ? (
              <div className="text-theme-text-muted py-8 text-center">Loading providers...</div>
            ) : (
              <div className="max-h-96 space-y-4 overflow-y-auto">
                {/* Local Providers - FIRST */}
                {groupedProviders.local.length > 0 && (
                  <div>
                    <h3 className="text-theme-text-muted mb-2 text-xs font-semibold tracking-wide uppercase">
                      🖥️ Local Models (Run on Your Computer)
                    </h3>
                    <div className="space-y-2">
                      {groupedProviders.local.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          onSelect={handleProviderSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Official Native SDK Providers - SECOND */}
                {groupedProviders.official.length > 0 && (
                  <div>
                    <h3 className="text-theme-text-muted mb-2 text-xs font-semibold tracking-wide uppercase">
                      ☁️ Official Cloud Providers
                    </h3>
                    <div className="space-y-2">
                      {groupedProviders.official.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          onSelect={handleProviderSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Providers - LAST */}
                {groupedProviders.community.length > 0 && (
                  <div>
                    <h3 className="text-theme-text-muted mb-2 text-xs font-semibold tracking-wide uppercase">
                      🌐 Community & Third-Party
                    </h3>
                    <div className="space-y-2">
                      {groupedProviders.community.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          onSelect={handleProviderSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filteredProviders.length === 0 && (
                  <div className="text-theme-text-muted py-8 text-center">
                    No providers found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected provider */}
            <div className="bg-theme-blue/10 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-theme-blue font-medium">
                    {selectedProvider.displayName || selectedProvider.name}
                  </span>
                  <ProviderBadge provider={selectedProvider} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider(null);
                    setDisplayName("");
                    setBaseUrl("");
                    setApiKey("");
                  }}
                  className="text-theme-blue text-sm hover:underline">
                  Change
                </button>
              </div>
              {(selectedProvider.website || selectedProvider.description) && (
                <p className="text-theme-text-muted mt-1 text-xs">
                  {selectedProvider.website ? (
                    <a
                      href={selectedProvider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline">
                      {selectedProvider.website}
                    </a>
                  ) : (
                    selectedProvider.description
                  )}
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="text-theme-text block text-sm font-medium">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onInput={(e) => setDisplayName(e.target.value)}
                placeholder={selectedProvider.displayName || selectedProvider.name}
                className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
              />
            </div>

            {/* Base URL (if required) */}
            {(selectedProvider.requiresBaseUrl || isLocalProvider(selectedProvider.id, selectedProvider)) && (
              <div>
                <label className="text-theme-text block text-sm font-medium">
                  {selectedProvider.baseUrlLabel || "Base URL"}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onInput={(e) => setBaseUrl(e.target.value)}
                  placeholder={getProviderBaseUrl(selectedProvider, import.meta.env.DEV) || "https://..."}
                  className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
                />
                <p className="text-theme-text-muted mt-1 text-xs">
                  {selectedProvider.id === "ollama"
                    ? "The API endpoint where Ollama is running"
                    : selectedProvider.category === "local"
                      ? "The API endpoint for this local provider"
                      : "The API endpoint for this provider"}
                </p>
              </div>
            )}

            {/* API Key - show for non-local providers or when explicitly required */}
            {!isLocalProvider(selectedProvider.id, selectedProvider) && (
              <div>
                <label className="text-theme-text block text-sm font-medium">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onInput={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue mt-1 w-full rounded-lg border px-4 py-2 focus:outline-none"
                />
                {selectedProvider.docs && (
                  <p className="text-theme-text-muted mt-1 text-xs">
                    Get your API key from{" "}
                    <a
                      href={selectedProvider.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline">
                      {selectedProvider.name} docs
                    </a>
                  </p>
                )}
              </div>
            )}

            {/* Environment Variables Warning */}
            {selectedProvider.requiresEnvVars && (
              <div className="bg-theme-yellow/10 text-theme-text rounded-lg p-3 text-sm">
                <strong>Note:</strong> This provider requires environment variables:{" "}
                <code className="bg-theme-surface rounded px-1">
                  {selectedProvider.requiresEnvVars.join(", ")}
                </code>
              </div>
            )}

            {error && (
              <div className="bg-theme-red/10 text-theme-red rounded-lg px-4 py-3 text-sm">
                <pre className="font-sans whitespace-pre-wrap">{error}</pre>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" plain onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" color="blue" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add & Fetch Models"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

// Provider card component
const ProviderCard = ({ provider, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(provider)}
    className="border-theme-surface-strong bg-theme-canvas hover:border-theme-blue hover:bg-theme-canvas-alt w-full rounded-lg border p-3 text-left transition-colors">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-theme-text font-medium">
            {provider.displayName || provider.name}
          </span>
          <ProviderBadge provider={provider} />
        </div>
        {/* Show capabilities for native providers OR description for community providers */}
        {provider.type ? (
          <div className="text-theme-text-muted mt-1 flex flex-wrap gap-2 text-xs">
            {provider.supportsVision && <span>👁️ Vision</span>}
            {provider.supportsTools && <span>🔧 Tools</span>}
            {provider.supportsStreaming && <span>⚡ Streaming</span>}
            {provider.supportsReasoning && <span>🧠 Reasoning</span>}
            {provider.supportsLiveSearch && <span>🔍 Live Search</span>}
          </div>
        ) : (
          provider.description && (
            <p className="text-theme-text-muted mt-1 text-sm">{provider.description}</p>
          )
        )}
      </div>
      <svg
        className="text-theme-text-muted h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>
);

export default AddProviderModal;
