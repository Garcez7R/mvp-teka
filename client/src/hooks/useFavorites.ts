import { useState, useEffect } from "react";

const FAVORITES_KEY = "teka_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar favoritos do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
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

  const toggleFavorite = (bookId: number) => {
    setFavorites((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  const isFavorite = (bookId: number) => favorites.includes(bookId);

  const getFavoriteCount = () => favorites.length;

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavoriteCount,
    isLoading,
  };
}
