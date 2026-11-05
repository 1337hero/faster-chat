import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { providersClient } from "@/lib/providersClient";
import { useUiState } from "@/state/useUiState";
import { CACHE_DURATIONS } from "@faster-chat/shared";

// Resolves the chat model that runs both prompt tools: the user's explicit
// choice if it's vision-capable, else the preferred model when it supports
// vision, else the first vision-capable text model.
export function usePromptModel() {
  const enhanceModelId = useUiState((state) => state.enhanceModelId);
  const preferredModel = useUiState((state) => state.preferredModel);
  const { data } = useQuery({
    queryKey: ["models", "text"],
    queryFn: () => providersClient.getEnabledModelsByType("text"),
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });

  const visionModels = (data?.models || []).filter((m) => m.metadata?.supports_vision);
  const isVision = (id) => visionModels.some((m) => m.model_id === id);
  const modelId =
    (isVision(enhanceModelId) ? enhanceModelId : null) ||
    (isVision(preferredModel) ? preferredModel : null) ||
    visionModels[0]?.model_id ||
    null;

  return { visionModels, modelId, modelsLoaded: data !== undefined };
}

// Cached reverse-prompt lookup keyed by file, length and model — toggling
// between lengths re-serves previous results instead of re-paying tokens.
export function useReversePrompt({ fileId, length, modelId }) {
  return useQuery({
    queryKey: ["reverse-prompt", fileId, length, modelId],
    queryFn: () =>
      apiFetch("/api/images/reverse-prompt", {
        method: "POST",
        body: JSON.stringify({ fileId, length, modelId }),
      }),
    enabled: !!modelId,
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });
}

export function useEnhancePrompt() {
  return useMutation({
    mutationFn: ({ prompt, modelId }) =>
      apiFetch("/api/images/enhance-prompt", {
        method: "POST",
        body: JSON.stringify({ prompt, modelId }),
      }),
  });
}
