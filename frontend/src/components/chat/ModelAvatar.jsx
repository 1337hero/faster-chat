import { getProviderBranding, getProviderLogoUrl } from "@/lib/providerUtils";
import { providersClient } from "@/lib/providersClient";
import { CACHE_DURATIONS } from "@faster-chat/shared";
import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-preact";
import { useState } from "preact/hooks";

const MODEL_PREFIX_TO_PROVIDER = [
  ["gpt-", "openai"],
  ["o1", "openai"],
  ["o3", "openai"],
  ["o4", "openai"],
  ["chatgpt-", "openai"],
  ["claude-", "anthropic"],
  ["gemini-", "google"],
  ["gemma-", "google"],
  ["mistral", "mistral"],
  ["codestral", "mistral"],
  ["pixtral", "mistral"],
  ["grok-", "xai"],
  ["deepseek", "deepseek"],
  ["command", "cohere"],
  ["llama", "meta"],
  ["sonar", "perplexity"],
  ["qwen", "qwen"],
];

function inferProvider(modelId) {
  if (!modelId) return null;
  const lower = modelId.toLowerCase();

  // Handle "provider/model" format (e.g. "openai/gpt-5.1" from OpenRouter)
  if (lower.includes("/")) {
    return lower.split("/")[0];
  }

  for (const [prefix, provider] of MODEL_PREFIX_TO_PROVIDER) {
    if (lower.startsWith(prefix)) return provider;
  }
  return null;
}

const ModelAvatar = ({ modelId }) => {
  const [logoFailed, setLogoFailed] = useState(false);

  const { data } = useQuery({
    queryKey: ["models", "text"],
    queryFn: () => providersClient.getEnabledModelsByType("text"),
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });

  // Try cache lookup first, fall back to inference from model name
  const models = data?.models || [];
  const modelData = models.find((m) => m.model_id === modelId);
  const providerId =
    modelData?.provider_name || modelData?.provider?.toLowerCase() || inferProvider(modelId);

  const branding = providerId ? getProviderBranding(providerId) : null;
  const hasBranding = branding?.style;

  return (
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10 ${
        hasBranding ? "" : "from-theme-mauve to-theme-blue bg-gradient-to-br"
      } text-white`}
      style={{
        boxShadow: "var(--shadow-depth-md)",
        ...(hasBranding ? branding.style : {}),
      }}>
      {providerId && !logoFailed ? (
        <img
          src={getProviderLogoUrl(providerId)}
          alt={providerId}
          className="h-5 w-5 md:h-6 md:w-6 dark:brightness-90 dark:invert"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <Cpu className="h-5 w-5 md:h-6 md:w-6" />
      )}
    </div>
  );
};

export default ModelAvatar;
