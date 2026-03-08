import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BookCard from "@/components/BookCard";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Filter, Heart, Moon, Sun } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { ALL_BOOK_CATEGORIES } from "@/lib/book-categories";
import { parseDateValue } from "@/lib/datetime";
import { useTheme } from "@/contexts/ThemeContext";

type CatalogSort =
  | "recent"
  | "most_favorited"
  | "title_asc"
  | "price_asc"
  | "price_desc";

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

function normalizeLocation(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function sortBooksWithCoverFirst<T extends { coverUrl?: string | null }>(books: T[]): T[] {
  return [...books]
    .map((book, index) => ({ book, index }))
    .sort((a, b) => {
      const aHasCover = Boolean(String(a.book.coverUrl ?? "").trim());
      const bHasCover = Boolean(String(b.book.coverUrl ?? "").trim());
      if (aHasCover !== bHasCover) return aHasCover ? -1 : 1;
      return a.index - b.index;
    })
    .map((entry) => entry.book);
}

export default function Home() {
  const { isAuthenticated, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
  const [draftFilters, setDraftFilters] = useState<{
    category: string;
    sebo: string;
    condition: string;
    status: string;
    sortBy: CatalogSort;
    city: string;
    state: string;
    minPrice: string;
    maxPrice: string;
  }>({
    category: "",
    sebo: "",
    condition: "",
    status: "",
    sortBy: "recent",
    city: "",
    state: "",
    minPrice: "",
    maxPrice: "",
  });
  const [prioritizeNearby, setPrioritizeNearby] = useState(true);
  const [searchBarKey, setSearchBarKey] = useState(0);
  const [page, setPage] = useState(0);
  const [loadedBooks, setLoadedBooks] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { getFavoriteCount, isFavorite } = useFavorites();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data: mySebo, isLoading: isMySeboLoading } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated && (role === "livreiro" || role === "admin"),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: mySeboBooks = [], isLoading: isMySeboBooksLoading } = trpc.books.listBySebo.useQuery(mySebo?.id || 0, {
    enabled: Boolean(mySebo?.id),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: meProfile } = trpc.users.me.useQuery(undefined, {
    enabled: isAuthenticated,
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
    setSearchBarKey((prev) => prev + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const syncDraftFromAppliedFilters = () => {
    setDraftFilters({
      category: selectedCategory || "",
      sebo: selectedSebo || "",
      condition: selectedCondition || "",
      status: selectedStatus || "",
      sortBy,
      city: cityFilter,
      state: stateFilter,
      minPrice: minPriceFilter,
      maxPrice: maxPriceFilter,
    });
  };

  const applyDraftFilters = async () => {
    setSelectedCategory(draftFilters.category || null);
    setSelectedSebo(draftFilters.sebo || null);
    setSelectedCondition(draftFilters.condition || null);
    setSelectedStatus((draftFilters.status || null) as "ativo" | "reservado" | "vendido" | null);
    setSortBy(draftFilters.sortBy);
    setCityFilter(draftFilters.city);
    setStateFilter(draftFilters.state.toUpperCase());
    setMinPriceFilter(draftFilters.minPrice);
    setMaxPriceFilter(draftFilters.maxPrice);
    setShowFilters(false);
    await refetchBooks();
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
    const buyerCity = normalizeLocation((meProfile as any)?.city);
    const buyerState = normalizeLocation((meProfile as any)?.state);
    const withReason = displayBooks.map((book: any) => {
      const normalizedTitle = normalizeSearchValue(String(book.title ?? ""));
      const normalizedAuthor = normalizeSearchValue(String(book.author ?? ""));
      const normalizedIsbn = normalizeSearchValue(String(book.isbn ?? ""));
      const seboCity = normalizeLocation(book?.sebo?.city);
      const seboState = normalizeLocation(book?.sebo?.state);
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
      const proximityLabel =
        buyerCity && seboCity && buyerCity === seboCity
          ? ("na_sua_cidade" as const)
          : buyerState && seboState && buyerState === seboState
          ? ("no_seu_estado" as const)
          : undefined;
      const proximityScore =
        proximityLabel === "na_sua_cidade"
          ? 2
          : proximityLabel === "no_seu_estado"
          ? 1
          : 0;
      return { ...book, matchReason, proximityLabel, proximityScore };
    });

    const baseFiltered = withReason.filter((book: any) => {
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

    const sortedByProximity = !prioritizeNearby || (!buyerCity && !buyerState)
      ? baseFiltered
      : [...baseFiltered]
      .map((book: any, index: number) => ({ book, index }))
      .sort((a, b) => {
        const scoreDiff = Number(b.book.proximityScore || 0) - Number(a.book.proximityScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return a.index - b.index;
      })
      .map((entry) => entry.book);

    return sortBooksWithCoverFirst(sortedByProximity);
  }, [
    displayBooks,
    selectedSebo,
    isFavorite,
    onlyFavorites,
    normalizedSearchQuery,
    prioritizeNearby,
    (meProfile as any)?.city,
    (meProfile as any)?.state,
  ]);
  const fallbackBooks = useMemo(() => {
    if (filteredBooks.length > 0 || normalizedSearchQuery.length < 4) return [];
    const buyerCity = normalizeLocation((meProfile as any)?.city);
    const buyerState = normalizeLocation((meProfile as any)?.state);
    const baseFallback = fuzzyFallbackBooks
      .map((book: any) => {
        const normalizedTitle = normalizeSearchValue(String(book.title ?? ""));
        const normalizedAuthor = normalizeSearchValue(String(book.author ?? ""));
        const normalizedIsbn = normalizeSearchValue(String(book.isbn ?? ""));
        const seboCity = normalizeLocation(book?.sebo?.city);
        const seboState = normalizeLocation(book?.sebo?.state);
        const proximityLabel =
          buyerCity && seboCity && buyerCity === seboCity
            ? ("na_sua_cidade" as const)
            : buyerState && seboState && buyerState === seboState
            ? ("no_seu_estado" as const)
            : undefined;
        const proximityScore =
          proximityLabel === "na_sua_cidade"
            ? 2
            : proximityLabel === "no_seu_estado"
            ? 1
            : 0;
        if (normalizedIsbn.includes(normalizedSearchQuery)) return { ...book, matchReason: "isbn" as const, proximityLabel, proximityScore };
        if (normalizedAuthor.includes(normalizedSearchQuery)) return { ...book, matchReason: "autor" as const, proximityLabel, proximityScore };
        if (normalizedTitle.includes(normalizedSearchQuery)) return { ...book, matchReason: "titulo" as const, proximityLabel, proximityScore };
        if (titleMatchesWithTolerance(String(book.title ?? ""), normalizedSearchQuery)) {
          return { ...book, matchReason: "titulo_aprox" as const, proximityLabel, proximityScore };
        }
        return null;
      })
      .filter(Boolean);

    const sortedByProximity = !prioritizeNearby || (!buyerCity && !buyerState)
      ? baseFallback
      : [...baseFallback]
        .map((book: any, index: number) => ({ book, index }))
        .sort((a, b) => {
          const scoreDiff = Number(b.book.proximityScore || 0) - Number(a.book.proximityScore || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return a.index - b.index;
        })
        .map((entry) => entry.book);

    return sortBooksWithCoverFirst(sortedByProximity).slice(0, PAGE_SIZE);
  }, [filteredBooks.length, fuzzyFallbackBooks, normalizedSearchQuery, PAGE_SIZE, prioritizeNearby, (meProfile as any)?.city, (meProfile as any)?.state]);

  const groupedBooks = filteredBooks.length > 0 ? filteredBooks : fallbackBooks;
  const lastCatalogUpdate = useMemo(() => {
    if (!groupedBooks.length) return null;
    let latest = 0;
    for (const book of groupedBooks) {
      const parsed = parseDateValue((book as any)?.updatedAt ?? (book as any)?.createdAt ?? 0);
      const timestamp = parsed ? parsed.getTime() : 0;
      if (timestamp > latest) {
        latest = timestamp;
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
  const showSellerOnboarding =
    role === "livreiro" &&
    !isMySeboLoading &&
    (!mySebo || (!isMySeboBooksLoading && mySeboBooks.length === 0));

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
        {showSellerOnboarding && (
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
                className={`px-3 py-2 rounded-full border-2 text-sm font-semibold ${
                  sortBy === "recent"
                    ? "bg-[#c93d45] text-[#1f245f] border-[#da4653]"
                    : "bg-[#da4653] text-[#262969] border-[#da4653] hover:bg-[#c93d45] hover:text-[#1f245f]"
                }`}
              >
                Recentes
              </button>
              <button
                onClick={() => setSortBy("price_asc")}
                className={`px-3 py-2 rounded-full border-2 text-sm font-semibold ${
                  sortBy === "price_asc"
                    ? "bg-[#c93d45] text-[#1f245f] border-[#da4653]"
                    : "bg-[#da4653] text-[#262969] border-[#da4653] hover:bg-[#c93d45] hover:text-[#1f245f]"
                }`}
              >
                Menor preço
              </button>
              <button
                onClick={() => setSortBy("price_desc")}
                className={`px-3 py-2 rounded-full border-2 text-sm font-semibold ${
                  sortBy === "price_desc"
                    ? "bg-[#c93d45] text-[#1f245f] border-[#da4653]"
                    : "bg-[#da4653] text-[#262969] border-[#da4653] hover:bg-[#c93d45] hover:text-[#1f245f]"
                }`}
              >
                Maior preço
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleTheme?.()}
              className="px-3 py-2 text-sm rounded border-2 border-[#da4653] bg-[#da4653] text-[#262969] hover:bg-[#c93d45] hover:text-[#1f245f] font-semibold"
            >
              <span className="inline-flex items-center gap-1">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPrioritizeNearby((prev) => !prev)}
              className="px-3 py-2 text-sm rounded border-2 border-[#da4653] bg-[#da4653] text-[#262969] hover:bg-[#c93d45] hover:text-[#1f245f] font-semibold"
            >
              {prioritizeNearby ? "Ver perto de mim: ON" : "Ver perto de mim: OFF"}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Visualização compacta ativa: mais livros por tela para navegação rápida.
        </p>

        {/* Filters Section */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={() => {
              if (!showFilters) syncDraftFromAppliedFilters();
              setShowFilters(!showFilters);
            }}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#da4653] rounded-full bg-[#da4653] text-[#262969] hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors font-inter text-sm font-semibold"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          {isAuthenticated && role !== "livreiro" && (
            <button
              onClick={() => setOnlyFavorites((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 border-2 rounded-full transition-colors font-inter text-sm font-semibold ${
                onlyFavorites
                  ? "border-[#da4653] bg-[#c93d45] text-[#1f245f]"
                  : "border-[#da4653] bg-[#da4653] text-[#262969] hover:bg-[#c93d45] hover:text-[#1f245f]"
              }`}
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
              className="mt-3 px-3 py-2 rounded-lg border-2 border-[#da4653] bg-[#da4653] text-[#262969] font-semibold hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors"
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
                    value={draftFilters.category}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, category: e.target.value }))}
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
                    value={draftFilters.sebo}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, sebo: e.target.value }))}
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
                    value={draftFilters.condition}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, condition: e.target.value }))}
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
                    value={draftFilters.status}
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full mb-2 px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">Todos os status</option>
                    <option value="ativo">Disponiveis</option>
                    <option value="reservado">Reservados</option>
                    <option value="vendido">Vendidos</option>
                  </select>
                  <select
                    value={draftFilters.sortBy}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({ ...prev, sortBy: e.target.value as CatalogSort }))
                    }
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
                  value={draftFilters.city}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="Cidade"
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <input
                  value={draftFilters.state}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                  }
                  placeholder="Estado (UF)"
                  maxLength={2}
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <input
                  value={draftFilters.minPrice}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                  placeholder="Preco min"
                  type="number"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
                <input
                  value={draftFilters.maxPrice}
                  onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="Preco max"
                  type="number"
                  min="0"
                  className="px-3 py-2 border border-gray-300 rounded bg-white"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    clearAllFilters();
                    setDraftFilters({
                      category: "",
                      sebo: "",
                      condition: "",
                      status: "",
                      sortBy: "recent",
                      city: "",
                      state: "",
                      minPrice: "",
                      maxPrice: "",
                    });
                    setShowFilters(false);
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-[#da4653] bg-[#da4653] text-[#262969] font-semibold hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => void applyDraftFilters()}
                  className="px-4 py-2 rounded-lg border-2 border-[#da4653] bg-[#da4653] text-[#262969] font-semibold hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors"
                >
                  Aplicar filtros
                </button>
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
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 transition-all duration-200 opacity-100"
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
                  compact
                  proximityLabel={book.proximityLabel}
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
                  className="px-4 py-2 rounded-lg border-2 border-[#da4653] bg-[#da4653] text-[#262969] text-sm font-semibold hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors"
                >
                  Carregar mais
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="px-4 py-2 rounded-lg border-2 border-[#da4653] bg-[#da4653] text-[#262969] text-sm font-semibold hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors"
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
              className="mt-4 px-4 py-2 border-2 border-[#da4653] bg-[#da4653] text-[#262969] rounded-lg font-semibold hover:bg-[#c93d45] hover:text-[#1f245f] transition-colors"
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
