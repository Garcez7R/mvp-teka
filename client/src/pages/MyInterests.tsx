import { useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Loader2, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export default function MyInterests() {
  const [activeTab, setActiveTab] = useState<"interests" | "favorites">("interests");
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { favorites: localFavoriteIds } = useFavorites();
  const {
    data: interests = [],
    isLoading: interestsLoading,
    error: interestsError,
    refetch: refetchInterests,
  } = trpc.books.myInterests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const {
    data: favorites = [],
    isLoading: favoritesLoading,
    error: favoritesError,
    refetch: refetchFavorites,
  } = trpc.favorites.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const { data: allBooks = [] } = trpc.books.list.useQuery(
    { limit: 300, offset: 0 },
    {
      enabled: isAuthenticated,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  const demoBooks = [
    {
      id: "demo-1",
      title: "Dom Casmurro",
      author: "Machado de Assis",
      category: "Literatura Brasileira",
      price: 25.0,
      coverUrl: "/covers/dom-casmurro.svg",
    },
    {
      id: "demo-2",
      title: "1984",
      author: "George Orwell",
      category: "Ficção Científica",
      price: 32.5,
      coverUrl: "https://covers.openlibrary.org/b/isbn/9788535914849-L.jpg",
      isbn: "9788535914849",
    },
    {
      id: "demo-3",
      title: "Crônicas Saxônicas",
      author: "Bernard Cornwell",
      category: "História",
      price: 35.0,
      coverUrl: "https://covers.openlibrary.org/b/isbn/9780007218011-L.jpg",
      isbn: "9780007218011",
    },
    {
      id: "demo-4",
      title: "As Duas Torres",
      author: "J.R.R. Tolkien",
      category: "Fantasia",
      price: 42.0,
      coverUrl: "/covers/as-duas-torres.svg",
      isbn: "9788595084759",
    },
    {
      id: "demo-5",
      title: "A Quarta Asa",
      author: "Rebecca Yarros",
      category: "Fantasia",
      price: 38.0,
      coverUrl: "https://covers.openlibrary.org/b/isbn/9781649374042-L.jpg",
      isbn: "9781649374042",
    },
    {
      id: "demo-6",
      title: "Harry Potter e a Pedra Filosofal",
      author: "J.K. Rowling",
      category: "Fantasia",
      price: 35.0,
      coverUrl: "https://covers.openlibrary.org/b/isbn/9788532511010-L.jpg",
      isbn: "9788532511010",
    },
  ];

  if (loading || interestsLoading || favoritesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#da4653]" />
        </main>
        <Footer />
      </div>
    );
  }

  const localFavoriteSet = new Set(localFavoriteIds.map((id) => String(id)));
  const fallbackFavoriteBooks = localFavoriteIds
    .map((favoriteId) => {
      const key = String(favoriteId);
      const dbBook = allBooks.find((book: any) => String(book.id) === key);
      if (dbBook) return dbBook;
      return demoBooks.find((book) => String(book.id) === key) ?? null;
    })
    .filter(Boolean) as any[];

  const effectiveFavorites = Array.from(
    new Map(
      [...favorites, ...fallbackFavoriteBooks].map((book: any) => [String(book.id), book])
    ).values()
  );
  const interestsTabError = Boolean(interestsError) && interests.length === 0;
  const favoritesTabError = Boolean(favoritesError) && effectiveFavorites.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-10">
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-600 hover:text-[#262969] transition-colors font-inter text-sm font-medium mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao catálogo
          </button>
        </Link>

        <div className="mb-6">
          <h1 className="font-outfit font-bold text-3xl text-[#262969]">Meus Interesses</h1>
          <p className="text-gray-600 font-inter mt-1">
            Acompanhe livros com interesse e seus favoritos.
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("interests")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "interests"
                ? "bg-[#262969] text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Interesses ({interests.length})
          </button>
            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "favorites"
                ? "bg-[#262969] text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            >
            Favoritos ({effectiveFavorites.length || localFavoriteSet.size})
            </button>
          </div>

        {activeTab === "interests" && interestsTabError ? (
          <div className="text-center py-10 border border-red-200 rounded-xl bg-red-50">
            <p className="font-inter text-red-700 mb-3">
              Não foi possível carregar seus dados agora.
            </p>
            <button
              type="button"
              onClick={() => {
                void refetchInterests();
                void refetchFavorites();
              }}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        ) : activeTab === "favorites" && favoritesTabError ? (
          <div className="text-center py-10 border border-red-200 rounded-xl bg-red-50">
            <p className="font-inter text-red-700 mb-3">
              Não foi possível carregar seus favoritos agora.
            </p>
            <button
              type="button"
              onClick={() => {
                void refetchFavorites();
              }}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        ) : activeTab === "interests" && interests.length === 0 ? (
          <div className="text-center py-16 border border-gray-200 rounded-xl bg-gray-50">
            <Heart className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="font-inter text-gray-700">Você ainda não marcou interesse em nenhum livro.</p>
          </div>
        ) : activeTab === "interests" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interests.map((item: any) => {
              const book = item.book;
              return (
                <Link
                  key={item.interestId}
                  href={`/book/${book.id}`}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow block bg-white"
                >
                    <div className="flex gap-4">
                      <div className="w-20 h-28 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                        <BookCover
                          isbn={book.isbn}
                          title={book.title}
                          author={book.author}
                          coverUrl={book.coverUrl}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-outfit font-semibold text-[#262969] truncate">{book.title}</h2>
                        {book.author ? (
                          <p className="text-sm text-gray-600 truncate">{book.author}</p>
                        ) : null}
                        <p className="text-sm font-semibold text-[#da4653] mt-1">
                          R$ {Number(book.price).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {item.sebo?.name || "Sebo"}
                          {item.sebo?.city ? ` • ${item.sebo.city}` : ""}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Interesse em{" "}
                          {new Date(Number(item.interestedAt)).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                </Link>
              );
            })}
          </div>
        ) : effectiveFavorites.length === 0 ? (
          <div className="text-center py-16 border border-gray-200 rounded-xl bg-gray-50">
            <Heart className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="font-inter text-gray-700">Você ainda não favoritou nenhum livro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {effectiveFavorites.map((book: any) => (
              <Link
                key={book.id}
                href={`/book/${book.id}`}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow block bg-white"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-28 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                    <BookCover
                      isbn={book.isbn}
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-outfit font-semibold text-[#262969] truncate">{book.title}</h2>
                    {book.author ? (
                      <p className="text-sm text-gray-600 truncate">{book.author}</p>
                    ) : null}
                    <p className="text-sm font-semibold text-[#da4653] mt-1">
                      R$ {Number(book.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">{book.category || "Sem categoria"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
