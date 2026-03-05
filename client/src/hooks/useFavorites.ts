import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { getSessionIdToken } from "@/lib/session";

const FAVORITES_KEY = "teka_favorites";
const normalizeId = (bookId: number | string) => String(bookId);

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasAuthToken = Boolean(getSessionIdToken());
  const utils = trpc.useUtils();
  const remoteFavoritesQuery = trpc.favorites.list.useQuery(undefined, {
    enabled: hasAuthToken,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const toggleRemoteFavorite = trpc.favorites.toggle.useMutation({
    onSuccess: async () => {
      await utils.favorites.list.invalidate();
    },
  });

  // Carregar favoritos do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.map((id) => String(id)));
        } else {
          setFavorites([]);
        }
      } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        setFavorites([]);
      }
    }
    setIsLoading(false);
  }, []);

  // Salvar favoritos no localStorage sempre que mudar
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isLoading]);

  useEffect(() => {
    if (!hasAuthToken) return;
    if (!remoteFavoritesQuery.isSuccess) return;
    const remoteIds = (remoteFavoritesQuery.data ?? []).map((book: any) =>
      normalizeId(book.id)
    );
    setFavorites(remoteIds);
  }, [hasAuthToken, remoteFavoritesQuery.data, remoteFavoritesQuery.isSuccess]);

  const toggleFavorite = (bookId: number | string) => {
    const key = normalizeId(bookId);
    const numericId = Number.parseInt(key, 10);

    // Always update UI immediately (works for both guest and logged sessions).
    setFavorites((prev) => {
      const wasFavorite = prev.includes(key);
      const next = wasFavorite ? prev.filter((id) => id !== key) : [...prev, key];
      trackEvent("favorite_toggled", { bookId: key, action: wasFavorite ? "remove" : "add" });
      return next;
    });

    if (hasAuthToken && Number.isFinite(numericId) && numericId > 0) {
      void toggleRemoteFavorite
        .mutateAsync(numericId)
        .then(() => utils.favorites.list.invalidate())
        .catch(() => {
          // Keep local state as fallback when API auth/session is unstable.
        });
      return;
    }
  };

  const isFavorite = (bookId: number | string) => favorites.includes(normalizeId(bookId));

  const getFavoriteCount = () => favorites.length;

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoriteCount,
    isLoading,
  };
}
