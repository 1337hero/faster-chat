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
    ? availableProviders.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableProviders;

  const groupedProviders = {
    local: filteredProviders.filter((p) => p.category === "local"),
    official: filteredProviders.filter((p) => p.category === "official"),
    community: filteredProviders.filter((p) => p.category === "community"),
  };

  const createMutation = useMutation({
    mutationFn: () => {
      // For Ollama, use dummy API key if not provided
      const finalApiKey = selectedProvider.id === "ollama" && !apiKey ? "ollama" : apiKey;
      const finalBaseUrl = baseUrl || selectedProvider.api || null;

      console.log("Submitting provider:", {
        name: selectedProvider.id,
        displayName: displayName || selectedProvider.name,
        providerType: getProviderType(selectedProvider),
        baseUrl: finalBaseUrl,
        hasApiKey: !!finalApiKey,
      });

      return providersClient.createProvider(
        selectedProvider.id,
        displayName || selectedProvider.name,
        getProviderType(selectedProvider),
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

    // Validate API key for non-local providers
    if (!apiKey && selectedProvider.category !== "local") {
      setError("API key is required");
      return;
    }

    // Validate base URL if required
    if (selectedProvider.requiresBaseUrl && !baseUrl) {
      setError("Base URL is required");
      return;
    }

    createMutation.mutate();
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setDisplayName(provider.name);
    if (provider.api) {
      setBaseUrl(provider.api);
    } else if (provider.id === "ollama") {
      setBaseUrl("http://localhost:11434/v1");
    }
  };

  const getProviderType = (provider) => {
    if (provider.id === "openai") return "official";
    if (provider.id === "anthropic") return "official";
    return "openai-compatible";
  };

  const getCategoryBadge = (category) => {
    const badges = {
      local: (
        <span className="inline-flex items-center gap-1 rounded-md bg-latte-green/10 px-2 py-0.5 text-xs font-medium text-latte-green dark:bg-macchiato-green/10 dark:text-macchiato-green">
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
        <span className="inline-flex items-center gap-1 rounded-md bg-latte-blue/10 px-2 py-0.5 text-xs font-medium text-latte-blue dark:bg-macchiato-blue/10 dark:text-macchiato-blue">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Official
        </span>
      ),
      community: (
        <span className="inline-flex items-center gap-1 rounded-md bg-latte-mauve/10 px-2 py-0.5 text-xs font-medium text-latte-mauve dark:bg-macchiato-mauve/10 dark:text-macchiato-mauve">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          Community
        </span>
      ),
    };
    return badges[category];
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
                className="w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text placeholder-latte-subtext0 focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:placeholder-macchiato-subtext0 dark:focus:border-macchiato-blue"
              />
            </div>

            {isLoadingProviders ? (
              <div className="py-8 text-center text-latte-subtext0 dark:text-macchiato-subtext0">
                Loading providers...
              </div>
            ) : (
              <div className="max-h-96 space-y-4 overflow-y-auto">
                {/* Local Providers - PRIORITIZED */}
                {groupedProviders.local.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-latte-subtext0 dark:text-macchiato-subtext0">
                      🖥️ Local Models (Run on Your Computer)
                    </h3>
                    <div className="space-y-2">
                      {groupedProviders.local.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          onSelect={handleProviderSelect}
                          badge={getCategoryBadge(provider.category)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Official Providers */}
                {groupedProviders.official.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-latte-subtext0 dark:text-macchiato-subtext0">
                      ☁️ Official Cloud Providers
                    </h3>
                    <div className="space-y-2">
                      {groupedProviders.official.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          onSelect={handleProviderSelect}
                          badge={getCategoryBadge(provider.category)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Providers */}
                {groupedProviders.community.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-latte-subtext0 dark:text-macchiato-subtext0">
                      🌐 Community & Third-Party
                    </h3>
                    <div className="space-y-2">
                      {groupedProviders.community.map((provider) => (
                        <ProviderCard
                          key={provider.id}
                          provider={provider}
                          onSelect={handleProviderSelect}
                          badge={getCategoryBadge(provider.category)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filteredProviders.length === 0 && (
                  <div className="py-8 text-center text-latte-subtext0 dark:text-macchiato-subtext0">
                    No providers found matching "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Selected provider */}
            <div className="rounded-lg bg-latte-blue/10 p-3 dark:bg-macchiato-blue/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-latte-blue dark:text-macchiato-blue">
                    {selectedProvider.name}
                  </span>
                  {getCategoryBadge(selectedProvider.category)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider(null);
                    setDisplayName("");
                    setBaseUrl("");
                    setApiKey("");
                  }}
                  className="text-sm text-latte-blue hover:underline dark:text-macchiato-blue"
                >
                  Change
                </button>
              </div>
              <p className="mt-1 text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
                {selectedProvider.description}
              </p>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onInput={(e) => setDisplayName(e.target.value)}
                placeholder={selectedProvider.name}
                className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
              />
            </div>

            {/* Base URL (if required) */}
            {(selectedProvider.requiresBaseUrl || selectedProvider.category === "local") && (
              <div>
                <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
                  Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onInput={(e) => setBaseUrl(e.target.value)}
                  placeholder={selectedProvider.id === "ollama" ? "http://localhost:11434/v1" : "https://..."}
                  className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
                />
                <p className="mt-1 text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
                  {selectedProvider.id === "ollama"
                    ? "The API endpoint where Ollama is running"
                    : "The API endpoint for this provider"}
                </p>
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
                API Key {selectedProvider.category === "local" && "(optional for local)"}
              </label>
              <input
                type="password"
                value={apiKey}
                onInput={(e) => setApiKey(e.target.value)}
                placeholder={selectedProvider.category === "local" ? "Not required for local" : "sk-..."}
                className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
              />
              <p className="mt-1 text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
                {selectedProvider.id === "openai" && "Get your key from platform.openai.com/api-keys"}
                {selectedProvider.id === "anthropic" && "Get your key from console.anthropic.com"}
                {selectedProvider.category === "local" && "Leave empty if running locally"}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-latte-red/10 px-4 py-3 text-sm text-latte-red dark:bg-macchiato-red/10 dark:text-macchiato-red">
                <pre className="whitespace-pre-wrap font-sans">{error}</pre>
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
    className="w-full rounded-lg border border-latte-surface1 bg-latte-base p-3 text-left transition-colors hover:border-latte-blue hover:bg-latte-mantle dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:hover:border-macchiato-blue dark:hover:bg-macchiato-base"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-latte-text dark:text-macchiato-text">{provider.name}</span>
          {badge}
        </div>
        <p className="mt-1 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
          {provider.description}
        </p>
      </div>
      <svg
        className="h-5 w-5 flex-shrink-0 text-latte-subtext0 dark:text-macchiato-subtext0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>
);

export default AddProviderModal;
