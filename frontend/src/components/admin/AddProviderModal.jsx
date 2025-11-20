import { useState } from "preact/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { providersClient } from "@/lib/providersClient";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";

const PROVIDER_TEMPLATES = [
  {
    name: "openai",
    displayName: "OpenAI",
    providerType: "official",
    requiresBaseUrl: false,
    description: "GPT-4, GPT-3.5, and other OpenAI models",
  },
  {
    name: "anthropic",
    displayName: "Anthropic",
    providerType: "official",
    requiresBaseUrl: false,
    description: "Claude 3.x and 4.x models",
  },
  {
    name: "ollama",
    displayName: "Ollama (Local)",
    providerType: "openai-compatible",
    requiresBaseUrl: true,
    defaultBaseUrl: "http://localhost:11434/v1",
    description: "Local models via Ollama",
  },
];

const AddProviderModal = ({ isOpen, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => {
      const template = PROVIDER_TEMPLATES.find((t) => t.name === selectedTemplate);
      // For Ollama, use dummy API key if not provided
      const finalApiKey = selectedTemplate === "ollama" && !apiKey ? "ollama" : apiKey;

      console.log("Submitting provider:", {
        name: template.name,
        displayName: displayName || template.displayName,
        providerType: template.providerType,
        baseUrl: baseUrl || template.defaultBaseUrl || null,
        hasApiKey: !!finalApiKey,
      });

      return providersClient.createProvider(
        template.name,
        displayName || template.displayName,
        template.providerType,
        baseUrl || template.defaultBaseUrl || null,
        finalApiKey
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "models"] });
      onClose();
      // Reset form
      setSelectedTemplate(null);
      setDisplayName("");
      setBaseUrl("");
      setApiKey("");
      setError("");
    },
    onError: (error) => {
      console.error("Create provider error:", error);
      // Show detailed error message
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

    if (!selectedTemplate) {
      setError("Please select a provider");
      return;
    }

    const template = PROVIDER_TEMPLATES.find((t) => t.name === selectedTemplate);

    if (!apiKey && selectedTemplate !== "ollama") {
      setError("API key is required");
      return;
    }

    if (template.requiresBaseUrl && !baseUrl) {
      setError("Base URL is required");
      return;
    }

    createMutation.mutate();
  };

  const handleTemplateSelect = (templateName) => {
    const template = PROVIDER_TEMPLATES.find((t) => t.name === templateName);
    setSelectedTemplate(templateName);
    setDisplayName(template.displayName);
    if (template.defaultBaseUrl) {
      setBaseUrl(template.defaultBaseUrl);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Connection">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider selection */}
        {!selectedTemplate ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
              Select Provider
            </label>
            {PROVIDER_TEMPLATES.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => handleTemplateSelect(template.name)}
                className="w-full rounded-lg border border-latte-surface1 bg-latte-base p-4 text-left transition-colors hover:border-latte-blue hover:bg-latte-mantle dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:hover:border-macchiato-blue dark:hover:bg-macchiato-base"
              >
                <div className="font-medium text-latte-text dark:text-macchiato-text">
                  {template.displayName}
                </div>
                <div className="mt-1 text-sm text-latte-subtext0 dark:text-macchiato-subtext0">
                  {template.description}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Selected provider */}
            <div className="rounded-lg bg-latte-blue/10 p-3 dark:bg-macchiato-blue/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-latte-blue dark:text-macchiato-blue">
                  {PROVIDER_TEMPLATES.find((t) => t.name === selectedTemplate)?.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setDisplayName("");
                    setBaseUrl("");
                    setApiKey("");
                  }}
                  className="text-sm text-latte-blue hover:underline dark:text-macchiato-blue"
                >
                  Change
                </button>
              </div>
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
                placeholder={PROVIDER_TEMPLATES.find((t) => t.name === selectedTemplate)?.displayName}
                className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
              />
            </div>

            {/* Base URL (if required) */}
            {PROVIDER_TEMPLATES.find((t) => t.name === selectedTemplate)?.requiresBaseUrl && (
              <div>
                <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
                  Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onInput={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
                />
                <p className="mt-1 text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
                  The API endpoint for this provider
                </p>
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-latte-text dark:text-macchiato-text">
                API Key {selectedTemplate === "ollama" && "(optional for local)"}
              </label>
              <input
                type="password"
                value={apiKey}
                onInput={(e) => setApiKey(e.target.value)}
                placeholder={selectedTemplate === "ollama" ? "Not required for local Ollama" : "sk-..."}
                className="mt-1 w-full rounded-lg border border-latte-surface1 bg-latte-base px-4 py-2 text-latte-text focus:border-latte-blue focus:outline-none dark:border-macchiato-surface1 dark:bg-macchiato-mantle dark:text-macchiato-text dark:focus:border-macchiato-blue"
              />
              <p className="mt-1 text-xs text-latte-subtext0 dark:text-macchiato-subtext0">
                {selectedTemplate === "openai" && "Get your key from platform.openai.com/api-keys"}
                {selectedTemplate === "anthropic" && "Get your key from console.anthropic.com"}
                {selectedTemplate === "ollama" && "Leave empty if running locally"}
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
              <Button
                type="submit"
                color="blue"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add & Fetch Models"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default AddProviderModal;
