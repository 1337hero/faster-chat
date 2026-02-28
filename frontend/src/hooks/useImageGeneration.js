import { IMAGE_GENERATION } from "@faster-chat/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

async function generateImage({
  prompt,
  aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO,
  chatId,
  model,
}) {
  return apiFetch("/api/images/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, aspectRatio, chatId, modelId: model }),
  });
}

async function fetchImageStatus() {
  return apiFetch("/api/images/status");
}

export function useImageGeneration({ onSuccess, onError } = {}) {
  const mutation = useMutation({
    mutationFn: generateImage,
    onSuccess,
    onError,
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useImageStatus() {
  return useQuery({
    queryKey: ["image-status"],
    queryFn: fetchImageStatus,
    staleTime: 5 * 60 * 1000,
  });
}
