import { IMAGE_GENERATION } from "@faster-chat/shared";
import { useMutation, useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

async function generateImage({ prompt, aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO, chatId, model }) {
  const response = await fetch(`${API_BASE}/api/images/generate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, aspectRatio, chatId, modelId: model }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Image generation failed");
  }

  return data;
}

async function fetchImageStatus() {
  const response = await fetch(`${API_BASE}/api/images/status`, {
    credentials: "include",
  });
  return response.json();
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
