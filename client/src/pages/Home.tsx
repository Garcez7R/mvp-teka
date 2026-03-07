import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BookCard from "@/components/BookCard";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Filter, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { ALL_BOOK_CATEGORIES } from "@/lib/book-categories";

type CatalogSort =
  | "recent"
  | "most_favorited"
  | "title_asc"
  | "price_asc"
  | "price_desc";
type CatalogView = "compact" | "detailed";

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function titleMatchesWithTolerance(title: string, query: string): boolean {
  const normalizedTitle = normalizeSearchValue(title);
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedTitle || !normalizedQuery) return false;
  if (normalizedTitle.includes(normalizedQuery)) return true;
  if (normalizedQuery.length < 4) return false;
  const words = normalizedTitle.split(/\s+/).filter(Boolean);
  return words.some((word) => Math.abs(word.length - normalizedQuery.length) <= 1 && levenshteinDistance(word, normalizedQuery) <= 1);
}

export default function Home() {
  const { isAuthenticated, role } = useAuth();
  const PAGE_SIZE = 24;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSebo, setSelectedSebo] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ativo" | "reservado" | "vendido" | null>(null);
  const [sortBy, setSortBy] = useState<CatalogSort>("recent");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [catalogView, setCatalogView] = useState<CatalogView>("compact");
  const [searchBarKey, setSearchBarKey] = useState(0);
  const [page, setPage] = useState(0);
  const [loadedBooks, setLoadedBooks] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { getFavoriteCount, isFavorite } = useFavorites();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data: mySebo } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated && (role === "livreiro" || role === "admin"),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: mySeboBooks = [] } = trpc.books.listBySebo.useQuery(mySebo?.id || 0, {
    enabled: Boolean(mySebo?.id),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedSebo(null);
    setSelectedCondition(null);
    setSelectedStatus(null);
    setCityFilter("");
    setStateFilter("");
    setMinPriceFilter("");
    setMaxPriceFilter("");
    setOnlyFavorites(false);
    setSortBy("recent");
    setShowFilters(false);
    setPage(0);
    setLoadedBooks([]);
    setHasMore(true);
    setSearchBarKey((prev) => prev + 1);
  };

  const booksQueryInput = {
    search: searchQuery || undefined,
    category: selectedCategory || undefined,
    condition: (selectedCondition as any) || undefined,
    availabilityStatus: selectedStatus || undefined,
    city: cityFilter || undefined,
    state: stateFilter || undefined,
    minPrice: minPriceFilter ? Number(minPriceFilter) : undefined,
    maxPrice: maxPriceFilter ? Number(maxPriceFilter) : undefined,
    sortBy,
    includeHidden: false,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  } as const;

  const {
    data: booksPage = [],
    isLoading: booksLoading,
    isFetching: booksFetching,
    error: booksError,
    refetch: refetchBooks,
  } = trpc.books.list.useQuery(booksQueryInput, {
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const { data: fuzzyFallbackBooks = [] } = trpc.books.list.useQuery(
    {
      limit: 240,
      offset: 0,
      includeHidden: false,
      sortBy: "recent",
    },
    {
      enabled: normalizedSearchQuery.length >= 4,
      refetchOnWindowFocus: false,
      retry: false,
    }
  );

  useEffect(() => {
    setPage(0);
    setLoadedBooks([]);
    setHasMore(true);
  }, [
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedStatus,
    cityFilter,
    stateFilter,
    minPriceFilter,
    maxPriceFilter,
    sortBy,
  ]);

  useEffect(() => {
    if (page === 0) {
      setLoadedBooks(booksPage);
    } else if (booksPage.length > 0) {
      setLoadedBooks((prev) => {
        const map = new Map(prev.map((book: any) => [String(book.id), book]));
        for (const book of booksPage) {
          map.set(String((book as any).id), book);
        }
        return Array.from(map.values());
      });
    }
    setHasMore(booksPage.length === PAGE_SIZE);
  }, [booksPage, page]);

  useEffect(() => {
    if (!hasMore || booksFetching) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.unobserve(entry.target);
        setPage((prev) => prev + 1);
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, booksFetching, loadedBooks.length]);

  const displayBooks = loadedBooks;

  // Get unique categories and sebos from the displayed data
  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...ALL_BOOK_CATEGORIES,
          ...displayBooks.map((b: any) => b.category).filter(Boolean),
        ])
      ),
    [displayBooks]
  );
  const sebos = useMemo(
    () => Array.from(new Set(displayBooks.map((b: any) => b.sebo?.name || "").filter(Boolean))),
    [displayBooks]
  );

  // Client-only filters (sebo/favoritos/lista de procura) on top of server query
  const filteredBooks = useMemo(() => {
    const withReason = displayBooks.map((book: any) => {
      const normalizedTitle = normalizeSearchValue(String(book.title ?? ""));
      const normalizedAuthor = normalizeSearchValue(String(book.author ?? ""));
      const normalizedIsbn = normalizeSearchValue(String(book.isbn ?? ""));
      let matchReason: "titulo" | "autor" | "isbn" | "titulo_aprox" | undefined;
      if (!normalizedSearchQuery) {
        matchReason = undefined;
      } else if (normalizedIsbn.includes(normalizedSearchQuery)) {
        matchReason = "isbn";
      } else if (normalizedAuthor.includes(normalizedSearchQuery)) {
        matchReason = "autor";
      } else if (normalizedTitle.includes(normalizedSearchQuery)) {
        matchReason = "titulo";
      } else if (titleMatchesWithTolerance(String(book.title ?? ""), normalizedSearchQuery)) {
        matchReason = "titulo_aprox";
      }
      return { ...book, matchReason };
    });

    return withReason.filter((book: any) => {
      const matchesSebo = !selectedSebo || book.sebo?.name === selectedSebo;
      const favoriteKey = String(book.id);
      const matchesFavorites = !onlyFavorites || isFavorite(favoriteKey);
      const matchesSearch = !normalizedSearchQuery || Boolean(book.matchReason);
      return (
        matchesSebo &&
        matchesFavorites &&
        matchesSearch
      );
    });
  }, [
    displayBooks,
    selectedSebo,
    isFavorite,
    onlyFavorites,
    normalizedSearchQuery,
  ]);
  const fallbackBooks = useMemo(() => {
    if (filteredBooks.length > 0 || normalizedSearchQuery.length < 4) return [];
    return fuzzyFallbackBooks
      .map((book: any) => {
        const normalizedTitle = normalizeSearchValue(String(book.title ?? ""));
        const normalizedAuthor = normalizeSearchValue(String(book.author ?? ""));
        const normalizedIsbn = normalizeSearchValue(String(book.isbn ?? ""));
        if (normalizedIsbn.includes(normalizedSearchQuery)) return { ...book, matchReason: "isbn" as const };
        if (normalizedAuthor.includes(normalizedSearchQuery)) return { ...book, matchReason: "autor" as const };
        if (normalizedTitle.includes(normalizedSearchQuery)) return { ...book, matchReason: "titulo" as const };
        if (titleMatchesWithTolerance(String(book.title ?? ""), normalizedSearchQuery)) {
          return { ...book, matchReason: "titulo_aprox" as const };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, PAGE_SIZE);
  }, [filteredBooks.length, fuzzyFallbackBooks, normalizedSearchQuery, PAGE_SIZE]);

  const groupedBooks = filteredBooks.length > 0 ? filteredBooks : fallbackBooks;
  const lastCatalogUpdate = useMemo(() => {
    if (!groupedBooks.length) return null;
    let latest = 0;
    for (const book of groupedBooks) {
      const raw = Number((book as any)?.updatedAt ?? (book as any)?.createdAt ?? 0);
      if (Number.isFinite(raw) && raw > latest) {
        latest = raw;
      }
    }
    return latest > 0 ? new Date(latest) : null;
  }, [groupedBooks]);

  useEffect(() => {
    document.title = "TEKA - Catálogo de Livros Usados";
    const description = "Busque livros usados por título, categoria e sebo parceiro na TEKA.";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/`);
  }, []);

  useEffect(() => {
    const handler = () => clearAllFilters();
    window.addEventListener("teka:reset-catalog", handler);
    return () => window.removeEventListener("teka:reset-catalog", handler);
  }, []);

  const hasBooksQueryError = Boolean(booksError);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white py-8 md:py-10">
        <div className="container">
          <h1 className="font-outfit font-bold text-2xl md:text-3xl mb-2">
            Encontre Livros Usados de Qualidade
          </h1>
          <p className="font-inter text-sm md:text-base text-gray-200 max-w-xl mb-5">
            Busque entre milhares de títulos em sebos parceiros. Preços justos, qualidade garantida.
          </p>
          
          <div className="max-w-xl">
            <SearchBar key={searchBarKey} onSearch={setSearchQuery} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container flex-1 py-12">
        {(role === "livreiro" || role === "admin") && (
          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h3 className="font-outfit font-semibold text-[#262969] mb-2">Onboarding do Livreiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className={`p-3 rounded border ${mySebo ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
                <p className="font-semibold">1. Criar Sebo</p>
                <p>{mySebo ? "Concluído" : "Pendente"}</p>
                {!mySebo && (
                  <Link href="/sebo/novo" className="text-[#da4653] hover:underline mt-1 inline-block">
                    Criar agora
                  </Link>
                )}
              </div>
              <div className={`p-3 rounded border ${mySeboBooks.length > 0 ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
                <p className="font-semibold">2. Cadastrar 1º Livro</p>
                <p>{mySeboBooks.length > 0 ? "Concluído" : "Pendente"}</p>
                {mySebo && mySeboBooks.length === 0 && (
                  <Link href="/add-book" className="text-[#da4653] hover:underline mt-1 inline-block">
                    Cadastrar livro
                  </Link>
                )}
              </div>
              <div className={`p-3 rounded border ${mySeboBooks.length > 0 ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
                <p className="font-semibold">3. Gerenciar Catálogo</p>
                <p>{mySeboBooks.length > 0 ? "Pronto para usar" : "Aguardando livro"}</p>
                {mySeboBooks.length > 0 && (
                  <Link href="/manage-books" className="text-[#da4653] hover:underline mt-1 inline-block">
                    Abrir painel
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSortBy("recent")}
                className={`px-3 py-2 rounded-full border text-sm ${
                  sortBy === "recent" ? "bg-[#262969] text-white border-[#262969]" : "bg-white"
                }`}
              >
                Recentes
              </button>
              <button
                onClick={() => setSortBy("price_asc")}
                className={`px-3 py-2 rounded-full border text-sm ${
                  sortBy === "price_asc" ? "bg-[#262969] text-white border-[#262969]" : "bg-white"
                }`}
              >
                Menor preço
              </button>
              <button
                onClick={() => setSortBy("price_desc")}
                className={`px-3 py-2 rounded-full border text-sm ${
                  sortBy === "price_desc" ? "bg-[#262969] text-white border-[#262969]" : "bg-white"
                }`}
              >
                Maior preço
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                setCatalogView((prev) => (prev === "compact" ? "detailed" : "compact"))
              }
              className="px-3 py-2 text-sm rounded border border-[#262969] text-[#262969] hover:bg-[#262969] hover:text-white"
            >
              {catalogView === "compact" ? "Visualização: Compacta" : "Visualização: Detalhada"}
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#da4653] rounded-full hover:bg-[#da4653] hover:text-white transition-colors font-inter text-sm font-medium text-[#da4653]"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          {isAuthenticated && role !== "livreiro" && (
            <button
              onClick={() => setOnlyFavorites((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#262969] rounded-full hover:bg-[#262969] hover:text-white transition-colors font-inter text-sm font-medium text-[#262969]"
              title="Ver livros favoritos"
            >
              <Heart className="w-4 h-4" />
              {onlyFavorites ? "Favoritos: ON" : "Favoritos"} ({getFavoriteCount()})
            </button>
          )}
        </div>

        {hasBooksQueryError && (
          <div className="mb-8 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            <p className="font-semibold">Falha ao carregar o catálogo.</p>
            <p className="mt-1">{booksError?.message || "Erro de rede ou de banco."}</p>
            <p className="mt-1">
              Se persistir no deploy, revise migrações do D1 (ex.: coluna <code>quantity</code> em <code>books</code>).
            </p>
            <button
              type="button"
              onClick={() => void refetchBooks()}
              className="mt-3 px-3 py-2 rounded bg-[#262969] text-white"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {showFilters && (
            <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="font-outfit font-semibold text-[#262969] mb-3">Categoria</h3>
                  <select
                    value={selectedCategory || ""}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">Todas</option>
                    {categories.map((cat: any) => (
                      <option key={cat as string} value={cat as string}>
                        {cat as string}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="font-outfit font-semibold text-[#262969] mb-3">Sebo</h3>
                  <select
                    value={selectedSebo || ""}
                    onChange={(e) => setSelectedSebo(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">Todos</option>
                    {sebos.map((sebo: any) => (
                      <option key={sebo as string} value={sebo as string}>
                        {sebo as string}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <h3 className="font-outfit font-semibold text-[#262969] mb-3">Condição, Status e Ordenação</h3>
                  <select
                    value={selectedCondition || ""}
                    onChange={(e) => setSelectedCondition(e.target.value || null)}
                    className="w-full mb-2 px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">Todas condições</option>
                    <option value="Novo">Novo</option>
                    <option value="Excelente">Excelente</option>
                    <option value="Bom estado">Bom estado</option>
                    <option value="Usado">Usado</option>
                    <option value="Desgastado">Desgastado</option>
                  </select>
                  <select
                    value={selectedStatus || ""}
                    onChange={(e) =>
                      setSelectedStatus(
                        (e.target.value || null) as "ativo" | "reservado" | "vendido" | null
                      )
                    }
                    className="w-full mb-2 px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">Todos os status</option>
                    <option value="ativo">Disponiveis</option>
                    <option value="reservado">Reservados</option>
                    <option value="vendido">Vendidos</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as CatalogSort)}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="recent">Recentes</option>
                    <option value="most_favorited">Top favoritados</option>
                    <option value="title_asc">A-Z Título</option>
                    <option value="price_asc">Menor preço</option>
                    <option value="price_desc">Maior preço</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <input
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Cidade"
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <input
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
                  placeholder="Estado (UF)"
                  maxLength={2}
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <input
                  value={minPriceFilter}
                  onChange={(e) => setMinPriceFilter(e.target.value)}
                  placeholder="Preco min"
                  type="number"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <input
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(e.target.value)}
                  placeholder="Preco max"
                  type="number"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
              </div>
            </div>
          )}

        {/* Results Count */}
        <div className="mb-6">
          <p className="font-inter text-sm text-gray-600">
            <span className="font-semibold text-[#262969]">{groupedBooks.length}</span>{" "}
            resultado(s) carregado(s)
          </p>
          {filteredBooks.length === 0 && fallbackBooks.length > 0 && (
            <p className="font-inter text-xs text-[#262969] mt-1">
              Mostrando aproximações de busca para ajudar com possíveis erros de digitação.
            </p>
          )}
          {hasMore && (
            <p className="font-inter text-xs text-gray-500 mt-1">
              Role para carregar mais livros.
            </p>
          )}
          {lastCatalogUpdate && (
            <p className="font-inter text-xs text-gray-500 mt-1">
              Última atualização do catálogo: {lastCatalogUpdate.toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        {/* Books Grid */}
        {groupedBooks.length > 0 ? (
          <>
            <div
              className={
                catalogView === "compact"
                  ? "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                  : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              }
            >
              {groupedBooks.map((book: any) => (
                <BookCard
                  key={book.id}
                  id={book.id}
                  title={book.title}
                  author={book.author ?? undefined}
                  category={book.category ?? ""}
                  price={book.price}
                  sebo={book.sebo ?? undefined}
                  condition={book.condition ?? ""}
                  isbn={book.isbn ?? undefined}
                  coverUrl={book.coverUrl ?? undefined}
                  quantity={Number(book.quantity ?? 1)}
                  offerCount={book.offerCount}
                  locationSummary={book.locationSummary}
                  priceLabel={book.priceLabel}
                  availabilityStatus={book.availabilityStatus ?? "ativo"}
                  matchReason={book.matchReason}
                  compact={catalogView === "compact"}
                />
              ))}
            </div>
            <div ref={loadMoreRef} className="h-10 mt-8 flex items-center justify-center">
              {booksFetching && hasMore ? (
                <p className="text-sm text-gray-500">Carregando mais livros...</p>
              ) : hasMore ? (
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  className="px-4 py-2 rounded border border-[#262969] text-[#262969] text-sm hover:bg-[#262969] hover:text-white"
                >
                  Carregar mais
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-sm text-[#262969] hover:text-[#da4653] underline"
                >
                  Voltar ao topo
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="font-inter text-gray-600 mb-2">
              {booksLoading ? "Carregando catálogo..." : "Nenhum livro encontrado"}
            </p>
            <p className="font-inter text-sm text-gray-500">Tente ajustar seus filtros ou busca</p>
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 border-2 border-[#da4653] text-[#da4653] rounded-lg font-medium hover:bg-[#da4653] hover:text-white transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
