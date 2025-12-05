import { useState } from "preact/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

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
    staleTime: 1000 * 60 * 60, // 1 hour
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

  const groupedProviders = {
    // Local: native openai-compatible + community local
    local: filteredProviders.filter(
      (p) => p.type === "openai-compatible" || p.category === "local"
    ),
    // Official: native official + community official
    official: filteredProviders.filter((p) => p.type === "official" || p.category === "official"),
    // Community: only community providers (not local/official)
    community: filteredProviders.filter((p) => p.category === "community"),
  };

  const createMutation = useMutation({
    mutationFn: () => {
      // For local providers, use dummy API key if not provided
      const isLocalProvider =
        !selectedProvider.requiresApiKey || selectedProvider.category === "local";
      const finalApiKey = isLocalProvider && !apiKey ? "local" : apiKey;
      const finalBaseUrl = baseUrl || null;
      const providerType = getProviderType(selectedProvider);

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

    // Validate API key if required (check both native and community formats)
    const isLocalProvider =
      selectedProvider.category === "local" || selectedProvider.type === "openai-compatible";
    if (!isLocalProvider && !apiKey && selectedProvider.requiresApiKey !== false) {
      setError("API key is required");
      return;
    }

    // Validate base URL if required
    if ((selectedProvider.requiresBaseUrl || isLocalProvider) && !baseUrl) {
      setError(`${selectedProvider.baseUrlLabel || "Base URL"} is required`);
      return;
    }

    createMutation.mutate();
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    // Handle both native (displayName) and community (name) formats
    setDisplayName(provider.displayName || provider.name);
    if (provider.baseUrlPlaceholder) {
      const placeholder = import.meta.env.DEV
        ? provider.baseUrlPlaceholderDev || provider.baseUrlPlaceholder
        : provider.baseUrlPlaceholder;
      setBaseUrl(placeholder);
    } else if (provider.api) {
      setBaseUrl(provider.api);
    } else if (provider.id === "ollama") {
      const placeholder = import.meta.env.DEV
        ? "http://localhost:11434"
        : "http://host.docker.internal:11434";
      setBaseUrl(placeholder);
    }
  };

  const getProviderType = (provider) => {
    // Native providers have 'type' field
    if (provider.type) return provider.type;
    // Community providers - determine from category or ID
    if (provider.id === "openai" || provider.id === "anthropic") return "official";
    return "openai-compatible";
  };

  const getTypeBadge = (provider) => {
    // Determine badge type from provider data
    const badgeType = provider.type || provider.category;

    const badges = {
      "openai-compatible": (
        <span className="bg-theme-green/10 text-theme-green inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          {provider.type ? "OpenAI Compatible" : "Local"}
        </span>
      ),
      local: (
        <span className="bg-theme-green/10 text-theme-green inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>
          Local
        </span>
      ),
      official: (
        <span className="bg-theme-blue/10 text-theme-blue inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {provider.type ? "Native SDK" : "Official"}
        </span>
      ),
      community: (
        <span className="bg-theme-mauve/10 text-theme-mauve inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          Community
        </span>
      ),
    };
    return badges[badgeType] || badges.community;
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
                          badge={getTypeBadge(provider)}
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
                          badge={getTypeBadge(provider)}
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
                          badge={getTypeBadge(provider)}
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
                  {getTypeBadge(selectedProvider)}
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
            {(selectedProvider.requiresBaseUrl || selectedProvider.category === "local") && (
              <div>
                <label className="text-theme-text block text-sm font-medium">
                  {selectedProvider.baseUrlLabel || "Base URL"}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onInput={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    selectedProvider.baseUrlPlaceholder
                      ? import.meta.env.DEV
                        ? selectedProvider.baseUrlPlaceholderDev ||
                          selectedProvider.baseUrlPlaceholder
                        : selectedProvider.baseUrlPlaceholder
                      : selectedProvider.id === "ollama"
                        ? import.meta.env.DEV
                          ? "http://localhost:11434"
                          : "http://host.docker.internal:11434"
                        : "https://..."
                  }
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

            {/* API Key */}
            {(selectedProvider.requiresApiKey ||
              (selectedProvider.category !== "local" &&
                selectedProvider.type !== "openai-compatible")) && (
              <div>
                <label className="text-theme-text block text-sm font-medium">
                  API Key {selectedProvider.category === "local" && "(optional for local)"}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onInput={(e) => setApiKey(e.target.value)}
                  placeholder={
                    selectedProvider.category === "local" ? "Not required for local" : "sk-..."
                  }
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
                {selectedProvider.category === "local" && (
                  <p className="text-theme-text-muted mt-1 text-xs">
                    Leave empty if running locally
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
const ProviderCard = ({ provider, onSelect, badge }) => (
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
          {badge}
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
