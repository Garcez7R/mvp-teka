import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BookCard from "@/components/BookCard";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Filter, Heart, Bell, Plus, Trash2 } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSebo, setSelectedSebo] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"ativo" | "reservado" | "vendido">("ativo");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [minPriceFilter, setMinPriceFilter] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [groupOffers, setGroupOffers] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchBarKey, setSearchBarKey] = useState(0);
  const [wishlistTitle, setWishlistTitle] = useState("");
  const [wishlistIsbn, setWishlistIsbn] = useState("");
  const [onlyWishlistMatches, setOnlyWishlistMatches] = useState(false);
  const { getFavoriteCount, isFavorite } = useFavorites();
  const utils = trpc.useUtils();
  const previousMatchesCountRef = useRef(0);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const includesAllTerms = (haystack: string, query: string) => {
    const h = normalizeText(haystack);
    const words = h.split(/[^a-z0-9]+/).filter(Boolean);
    const terms = normalizeText(query).split(/\s+/).filter(Boolean);
    return terms.every((term) => {
      if (h.includes(term)) return true;
      if (term.length < 4) return false;
      const fuzzyPrefix = term.slice(0, term.length - 1);
      return words.some((word) => word.startsWith(fuzzyPrefix));
    });
  };

  const { data: wishlistItems = [] } = trpc.wishlist.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: wishlistMatches = [] } = trpc.wishlist.matches.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });
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
  const addWishlistMutation = trpc.wishlist.add.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.wishlist.list.invalidate(),
        utils.wishlist.matches.invalidate(),
      ]);
      setWishlistTitle("");
      setWishlistIsbn("");
      toast.success("Livro adicionado na lista de procura.");
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao adicionar item na lista.");
    },
  });
  const removeWishlistMutation = trpc.wishlist.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.wishlist.list.invalidate(),
        utils.wishlist.matches.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(error.message || "Falha ao remover item da lista.");
    },
  });

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedSebo(null);
    setSelectedCondition(null);
    setSelectedStatus("ativo");
    setCityFilter("");
    setStateFilter("");
    setMinPriceFilter("");
    setMaxPriceFilter("");
    setOnlyFavorites(false);
    setGroupOffers(true);
    setOnlyWishlistMatches(false);
    setShowFilters(false);
    setSearchBarKey((prev) => prev + 1);
  };

  const handleAddWishlist = async () => {
    if (!isAuthenticated) {
      toast.error("Faça login para usar a lista de procura.");
      return;
    }
    if (!wishlistTitle.trim() && !wishlistIsbn.trim()) {
      toast.error("Informe um título ou ISBN.");
      return;
    }
    await addWishlistMutation.mutateAsync({
      title: wishlistTitle.trim() || undefined,
      isbn: wishlistIsbn.trim() || undefined,
    });
  };

  // Fetch books from API
  const { data: booksData = [] } = trpc.books.list.useQuery({
    search: undefined,
    category: selectedCategory || undefined,
    condition: (selectedCondition as any) || undefined,
    availabilityStatus: selectedStatus,
    city: cityFilter || undefined,
    state: stateFilter || undefined,
    minPrice: minPriceFilter ? Number(minPriceFilter) : undefined,
    maxPrice: maxPriceFilter ? Number(maxPriceFilter) : undefined,
    limit: 100,
  });

  // Se não houver livros e não houver filtros aplicados, exibir livros de demonstração
  const displayBooks = useMemo(() => {
    if (booksData.length === 0 && !searchQuery && !selectedCategory && !selectedSebo) {
      // Livros de demonstração com capas reais
      return [
        {
          id: 'demo-1',
          title: 'Dom Casmurro',
          author: 'Machado de Assis',
          category: 'Literatura Brasileira',
          price: 25.00,
          condition: 'Bom estado',
          isbn: undefined,
          coverUrl: '/covers/dom-casmurro.svg',
          availabilityStatus: 'ativo',
          sebo: {
            name: 'Sebo do Porto',
            city: 'Porto Alegre',
            state: 'RS'
          }
        },
        {
          id: 'demo-2',
          title: '1984',
          author: 'George Orwell',
          category: 'Ficção Científica',
          price: 32.50,
          condition: 'Excelente',
          isbn: '9788535914849',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9788535914849-L.jpg',
          availabilityStatus: 'ativo',
          sebo: {
            name: 'Sebo do Porto',
            city: 'Porto Alegre',
            state: 'RS'
          }
        },
        {
          id: 'demo-3',
          title: 'Crônicas Saxônicas',
          author: 'Bernard Cornwell',
          category: 'História',
          price: 35.00,
          condition: 'Bom estado',
          isbn: '9780007218011',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9780007218011-L.jpg',
          availabilityStatus: 'ativo',
          sebo: {
            name: 'Livraria Releitura',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        {
          id: 'demo-4',
          title: 'As Duas Torres',
          author: 'J.R.R. Tolkien',
          category: 'Fantasia',
          price: 42.00,
          condition: 'Excelente',
          isbn: '9788595084759',
          coverUrl: '/covers/as-duas-torres.svg',
          availabilityStatus: 'ativo',
          sebo: {
            name: 'Livraria Releitura',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        {
          id: 'demo-5',
          title: 'A Quarta Asa',
          author: 'Rebecca Yarros',
          category: 'Fantasia',
          price: 38.00,
          condition: 'Bom estado',
          isbn: '9781649374042',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9781649374042-L.jpg',
          availabilityStatus: 'ativo',
          sebo: {
            name: 'Sebo do Porto',
            city: 'Porto Alegre',
            state: 'RS'
          }
        },
        {
          id: 'demo-6',
          title: 'Harry Potter e a Pedra Filosofal',
          author: 'J.K. Rowling',
          category: 'Fantasia',
          price: 35.00,
          condition: 'Bom estado',
          isbn: '9788532511010',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9788532511010-L.jpg',
          availabilityStatus: 'ativo',
          sebo: {
            name: 'Livraria Releitura',
            city: 'São Paulo',
            state: 'SP'
          }
        }
      ];
    }
    return booksData;
  }, [booksData, searchQuery, selectedCategory, selectedSebo]);

  // Get unique categories and sebos from the displayed data
  const categories = useMemo(
    () => Array.from(new Set(displayBooks.map((b: any) => b.category).filter(Boolean))),
    [displayBooks]
  );
  const sebos = useMemo(
    () => Array.from(new Set(displayBooks.map((b: any) => b.sebo?.name || "").filter(Boolean))),
    [displayBooks]
  );

  // Filter books locally
  const filteredBooks = useMemo(() => {
    const matchBookIds = new Set(
      wishlistMatches
        .map((match: any) => Number(match.bookId))
        .filter((id: number) => Number.isFinite(id))
    );
    return displayBooks.filter((book: any) => {
      const matchesSearch =
        !searchQuery ||
        includesAllTerms(
          `${book.title || ""} ${book.author || ""} ${book.category || ""} ${book.sebo?.name || ""}`,
          searchQuery
        );
      const matchesCategory = !selectedCategory || book.category === selectedCategory;
      const matchesSebo = !selectedSebo || book.sebo?.name === selectedSebo;
      const matchesCondition = !selectedCondition || book.condition === selectedCondition;
      const matchesStatus = !selectedStatus || (book.availabilityStatus || "ativo") === selectedStatus;
      const price = Number(book.price);
      const matchesMin = !minPriceFilter || price >= Number(minPriceFilter);
      const matchesMax = !maxPriceFilter || price <= Number(maxPriceFilter);
      const city = (book.sebo?.city || "").toLowerCase();
      const state = (book.sebo?.state || "").toLowerCase();
      const matchesCity = !cityFilter || city.includes(cityFilter.toLowerCase());
      const matchesState = !stateFilter || state === stateFilter.toLowerCase();
      const favoriteKey = String(book.id);
      const matchesFavorites = !onlyFavorites || isFavorite(favoriteKey);
      const numericId = Number(book.id);
      const matchesWishlist = !onlyWishlistMatches || matchBookIds.has(numericId);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesSebo &&
        matchesCondition &&
        matchesStatus &&
        matchesMin &&
        matchesMax &&
        matchesCity &&
        matchesState &&
        matchesFavorites &&
        matchesWishlist
      );
    });
  }, [
    cityFilter,
    displayBooks,
    maxPriceFilter,
    minPriceFilter,
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedSebo,
    selectedStatus,
    stateFilter,
    isFavorite,
    onlyFavorites,
    onlyWishlistMatches,
    wishlistMatches,
  ]);

  const groupedBooks = useMemo(() => {
    if (!groupOffers) return filteredBooks;

    const grouped = new Map<string, any[]>();
    for (const book of filteredBooks) {
      const isbnKey = String(book.isbn || "").trim();
      const titleKey = normalizeText(String(book.title || ""));
      const authorKey = normalizeText(String(book.author || ""));
      const groupKey = isbnKey
        ? `isbn:${isbnKey}`
        : `title:${titleKey}|author:${authorKey}`;
      const current = grouped.get(groupKey) ?? [];
      current.push(book);
      grouped.set(groupKey, current);
    }

    return Array.from(grouped.values()).map((items) => {
      const sortedByPrice = [...items].sort((a, b) => Number(a.price) - Number(b.price));
      const cheapest = sortedByPrice[0];
      const minPrice = Number(sortedByPrice[0].price);
      const maxPrice = Number(sortedByPrice[sortedByPrice.length - 1].price);
      const distinctSebos = new Set(
        items.map((book) => String(book?.sebo?.name || "").trim()).filter(Boolean)
      ).size;
      const distinctStates = new Set(
        items
          .map((book) => String(book?.sebo?.state || "").trim().toUpperCase())
          .filter(Boolean)
      ).size;

      return {
        ...cheapest,
        offerCount: items.length,
        quantity: items.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0),
        locationSummary:
          items.length > 1
            ? `${distinctSebos} sebo(s) • ${distinctStates || 1} estado(s)`
            : cheapest?.sebo?.name || "Sebo",
        priceLabel:
          items.length > 1
            ? minPrice === maxPrice
              ? `A partir de R$ ${minPrice.toFixed(2)}`
              : `R$ ${minPrice.toFixed(2)} - R$ ${maxPrice.toFixed(2)}`
            : `R$ ${Number(cheapest.price).toFixed(2)}`,
      };
    });
  }, [filteredBooks, groupOffers]);

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
    if (!isAuthenticated) return;
    const previous = previousMatchesCountRef.current;
    const current = wishlistMatches.length;
    if (current > previous && previous > 0) {
      toast.success(`Boa notícia: ${current - previous} novo(s) livro(s) da sua lista de procura apareceu(ram).`);
    }
    previousMatchesCountRef.current = current;
  }, [isAuthenticated, wishlistMatches.length]);

  useEffect(() => {
    const handler = () => clearAllFilters();
    window.addEventListener("teka:reset-catalog", handler);
    return () => window.removeEventListener("teka:reset-catalog", handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white py-12 md:py-16">
        <div className="container">
          <h1 className="font-outfit font-bold text-3xl md:text-4xl mb-3">
            Encontre Livros Usados de Qualidade
          </h1>
          <p className="font-inter text-gray-200 max-w-2xl mb-8">
            Busque entre milhares de títulos em sebos parceiros. Preços justos, qualidade garantida.
          </p>
          
          <div className="max-w-2xl">
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

        {/* Filters Section */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#da4653] rounded-lg hover:bg-[#da4653] hover:text-white transition-colors font-inter text-sm font-medium text-[#da4653]"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#262969] rounded-lg hover:bg-[#262969] hover:text-white transition-colors font-inter text-sm font-medium text-[#262969]"
            title="Ver livros favoritos"
          >
            <Heart className="w-4 h-4" />
            {onlyFavorites ? "Favoritos: ON" : "Favoritos"} ({getFavoriteCount()})
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setOnlyWishlistMatches((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#1f7a8c] rounded-lg hover:bg-[#1f7a8c] hover:text-white transition-colors font-inter text-sm font-medium text-[#1f7a8c]"
              title="Ver livros da sua lista de procura"
            >
              <Bell className="w-4 h-4" />
              {onlyWishlistMatches ? "Lista de Procura: ON" : "Lista de Procura"} ({wishlistMatches.length})
            </button>
          )}
          <button
            onClick={() => setGroupOffers((prev) => !prev)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#4b5563] rounded-lg hover:bg-[#4b5563] hover:text-white transition-colors font-inter text-sm font-medium text-[#4b5563]"
            title="Agrupar ofertas iguais por ISBN/título"
          >
            {groupOffers ? "Agrupado: ON" : "Agrupado: OFF"}
          </button>
        </div>

        {isAuthenticated && (
          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-outfit font-semibold text-[#262969]">Lista de Procura</h3>
              <span className="text-xs text-gray-600">
                {wishlistMatches.length} match(es) ativo(s)
              </span>
            </div>
            {wishlistMatches.length > 0 && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                Encontramos {wishlistMatches.length} livro(s) da sua lista disponíveis no catálogo.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input
                value={wishlistTitle}
                onChange={(e) => setWishlistTitle(e.target.value)}
                placeholder="Título (ex: Duna)"
                className="px-3 py-2 border border-gray-300 rounded bg-white"
              />
              <input
                value={wishlistIsbn}
                onChange={(e) => setWishlistIsbn(e.target.value)}
                placeholder="ISBN (opcional)"
                className="px-3 py-2 border border-gray-300 rounded bg-white"
              />
              <button
                type="button"
                onClick={() => void handleAddWishlist()}
                disabled={addWishlistMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#262969] text-white hover:bg-[#1a1a4d] disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                Adicionar à procura
              </button>
            </div>
            {wishlistItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {wishlistItems.map((item: any) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-300 text-sm text-gray-700"
                  >
                    {item.title || item.isbn}
                    <button
                      type="button"
                      onClick={() => void removeWishlistMutation.mutateAsync({ id: item.id })}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Remover da lista de procura"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhum item na sua lista de procura ainda.</p>
            )}
          </div>
        )}

        {showFilters && (
            <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="font-outfit font-semibold text-[#262969] mb-3">Categoria</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`block w-full text-left px-3 py-2 rounded transition-colors font-inter text-sm ${
                        !selectedCategory
                          ? "bg-[#da4653] text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Todas
                    </button>
                    {categories.map((cat: any) => (
                      <button
                        key={cat as string}
                        onClick={() => setSelectedCategory(cat as string)}
                        className={`block w-full text-left px-3 py-2 rounded transition-colors font-inter text-sm ${
                          selectedCategory === cat
                            ? "bg-[#da4653] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {cat as string}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sebo Filter */}
                <div>
                  <h3 className="font-outfit font-semibold text-[#262969] mb-3">Sebo</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedSebo(null)}
                      className={`block w-full text-left px-3 py-2 rounded transition-colors font-inter text-sm ${
                        !selectedSebo
                          ? "bg-[#da4653] text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      Todos
                    </button>
                    {sebos.map((sebo: any) => (
                      <button
                        key={sebo as string}
                        onClick={() => setSelectedSebo(sebo as string)}
                        className={`block w-full text-left px-3 py-2 rounded transition-colors font-inter text-sm ${
                          selectedSebo === sebo
                            ? "bg-[#da4653] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {sebo as string}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-outfit font-semibold text-[#262969] mb-3">Condição e Status</h3>
                  <select
                    value={selectedCondition || ""}
                    onChange={(e) => setSelectedCondition(e.target.value || null)}
                    className="w-full mb-2 px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="">Todas condições</option>
                    <option value="Excelente">Excelente</option>
                    <option value="Bom estado">Bom estado</option>
                    <option value="Usado">Usado</option>
                    <option value="Desgastado">Desgastado</option>
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as "ativo" | "reservado" | "vendido")}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="ativo">Disponiveis</option>
                    <option value="reservado">Reservados</option>
                    <option value="vendido">Vendidos</option>
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
            <span className="font-semibold text-[#262969]">{groupedBooks.length}</span> resultado(s) encontrado(s)
          </p>
          {groupOffers && (
            <p className="font-inter text-xs text-gray-500 mt-1">
              Ofertas iguais estão agrupadas por ISBN/título para facilitar comparação.
            </p>
          )}
        </div>

        {/* Books Grid */}
        {groupedBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="font-inter text-gray-600 mb-2">Nenhum livro encontrado</p>
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
