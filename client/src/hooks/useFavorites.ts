import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { getSessionIdToken } from "@/lib/session";

const FAVORITES_KEY = "teka_favorites";
const normalizeId = (bookId: number | string) => String(bookId);
const FAVORITES_EVENT = "teka:favorites-updated";

function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function readFavoritesFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(FAVORITES_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferLocalFallback, setPreferLocalFallback] = useState(false);
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
    setFavorites(readFavoritesFromStorage());
    setIsLoading(false);
  }, []);

  // Sync between multiple hook instances in the same tab and across tabs.
  useEffect(() => {
    const sync = () => {
      const next = readFavoritesFromStorage();
      setFavorites((prev) => (sameIds(prev, next) ? prev : next));
    };
    window.addEventListener("storage", sync);
    window.addEventListener(FAVORITES_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(FAVORITES_EVENT, sync as EventListener);
    };
  }, []);

  // Salvar favoritos no localStorage sempre que mudar
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
    }
  }, [favorites, isLoading]);

  useEffect(() => {
    if (!hasAuthToken) return;
    if (preferLocalFallback) return;
    if (!remoteFavoritesQuery.isSuccess) return;
    const remoteIds = (remoteFavoritesQuery.data ?? []).map((book: any) =>
      normalizeId(book.id)
    );
    setFavorites((prev) => {
      if (remoteIds.length === 0 && prev.length > 0) {
        return prev;
      }
      return remoteIds;
    });
  }, [hasAuthToken, preferLocalFallback, remoteFavoritesQuery.data, remoteFavoritesQuery.isSuccess]);

  useEffect(() => {
    if (remoteFavoritesQuery.isError) {
      setPreferLocalFallback(true);
    }
  }, [remoteFavoritesQuery.isError]);

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
      setPreferLocalFallback(false);
      void toggleRemoteFavorite
        .mutateAsync(numericId)
        .then(() => utils.favorites.list.invalidate())
        .catch(() => {
          // Keep local state as fallback when API auth/session is unstable.
          setPreferLocalFallback(true);
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
