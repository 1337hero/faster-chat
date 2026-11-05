import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuthState } from "@/state/useAuthState";
import { galleryKeys } from "./queryKeys";

export function useImageGallery() {
  const queryClient = useQueryClient();
  const userId = useAuthState((state) => state.user?.id ?? null);

  const { data, isLoading, error } = useQuery({
    queryKey: galleryKeys.list(userId),
    queryFn: () => apiFetch("/api/images/gallery"),
    enabled: userId !== null,
  });

  const favoriteMutation = useMutation({
    mutationFn: (fileId) => apiFetch(`/api/images/gallery/${fileId}/favorite`, { method: "POST" }),
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: galleryKeys.list(userId) });
      const previous = queryClient.getQueryData(galleryKeys.list(userId));
      queryClient.setQueryData(galleryKeys.list(userId), (old) => {
        if (!old) {
          return old;
        }
        return {
          ...old,
          images: old.images.map((image) =>
            image.id === fileId ? { ...image, isFavorite: !image.isFavorite } : image
          ),
        };
      });
      return { previous };
    },
    onError: (_error, _fileId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(galleryKeys.list(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.list(userId) });
    },
  });

  return {
    images: data?.images ?? [],
    isLoading,
    error,
    toggleFavorite: favoriteMutation.mutate,
    isToggling: favoriteMutation.isPending,
  };
}
