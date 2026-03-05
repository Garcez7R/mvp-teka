import { useParams, Link } from "wouter";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import { WHATSAPP_DEFAULT } from "@/const";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";
import { BookOpen, MapPin, Calendar, FileText, MessageCircle, ArrowLeft, Heart, Loader2 } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getSessionIdToken } from "@/lib/session";

export default function Book() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, refresh } = useAuth();
  const utils = trpc.useUtils();
  const isDemoBook = Boolean(id?.startsWith("demo-"));
  const parsedBookId = Number.parseInt(id || "", 10);
  const favoriteId = isDemoBook ? (id || null) : Number.isFinite(parsedBookId) ? parsedBookId : null;

  // Fetch book from API only for real IDs
  const { data: book, isLoading, error } = trpc.books.getById.useQuery(parsedBookId, {
    enabled: !isDemoBook && Number.isFinite(parsedBookId) && parsedBookId > 0,
  });
  const registerInterestMutation = trpc.books.registerInterest.useMutation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = favoriteId ? isFavorite(favoriteId) : false;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    const selectedTitle = isDemoBook
      ? id?.replace("demo-", "Livro")
      : book?.title;
    if (selectedTitle) {
      document.title = `TEKA - ${selectedTitle}`;
      const description = `Confira detalhes e disponibilidade de ${selectedTitle} na TEKA.`;
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
      canonical.setAttribute("href", window.location.href);
      trackEvent("book_view", { title: selectedTitle, demo: isDemoBook });
    }
  }, [book?.title, id, isDemoBook]);

  const handleInterest = async (bookId: number | null, title: string) => {
    trackEvent("book_interest_click", { bookId: bookId ?? -1, title });
    if (!bookId) {
      toast.error("Não foi possível registrar interesse neste livro.");
      return;
    }
    const hasToken = Boolean(getSessionIdToken());
    if (!isAuthenticated && !hasToken) {
      toast.error("Faça login para registrar interesse.");
      return;
    }
    try {
      const result = await registerInterestMutation.mutateAsync({ bookId });
      await utils.books.myInterests.invalidate();
      const total = result?.totalInterests;
      toast.success(
        total && Number.isFinite(total)
          ? `Interesse registrado. ${total} pessoa(s) interessada(s).`
          : "Interesse registrado com sucesso."
      );
    } catch (error: any) {
      const message = String(error?.message || "");
      const unauthenticated =
        error?.data?.code === "UNAUTHORIZED" || /not authenticated/i.test(message);

      if (unauthenticated) {
        try {
          await refresh();
          const retry = await registerInterestMutation.mutateAsync({ bookId });
          await utils.books.myInterests.invalidate();
          const retryTotal = retry?.totalInterests;
          toast.success(
            retryTotal && Number.isFinite(retryTotal)
              ? `Interesse registrado. ${retryTotal} pessoa(s) interessada(s).`
              : "Interesse registrado com sucesso."
          );
          return;
        } catch {
          toast.error("Não foi possível validar sua sessão agora. Tente novamente em instantes.");
          return;
        }
      }

      const fallbackMessage =
        typeof error?.message === "string" && error.message.length > 0
          ? error.message
          : "Faça login para registrar interesse.";
      toast.error(fallbackMessage);
    }
  };

  if (isLoading) {
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

  // Se for um livro de demonstração (id começa com 'demo-'), exibir informações de demonstração
  if (isDemoBook) {
    const demoBooks = [
      {
        id: 'demo-1',
        title: 'Dom Casmurro',
        author: 'Machado de Assis',
        category: 'Literatura Brasileira',
        price: 25.00,
        condition: 'Bom estado',
        availabilityStatus: 'ativo' as const,
        isbn: undefined,
        coverUrl: '/covers/dom-casmurro.svg',
        description: 'Clássico da literatura brasileira, narra a história de Bentinho e Capitu.',
        pages: 256,
        year: 1899,
        sebo: {
          name: 'Sebo do Porto',
          city: 'Porto Alegre',
          state: 'RS',
          whatsapp: '5551999999999'
        }
      },
      {
        id: 'demo-2',
        title: '1984',
        author: 'George Orwell',
        category: 'Ficção Científica',
        price: 32.50,
        condition: 'Excelente',
        availabilityStatus: 'ativo' as const,
        isbn: '9788535914849',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9788535914849-L.jpg',
        description: 'Distopia sobre um futuro totalitário e vigilância constante.',
        pages: 328,
        year: 1949,
        sebo: {
          name: 'Sebo do Porto',
          city: 'Porto Alegre',
          state: 'RS',
          whatsapp: '5551999999999'
        }
      },
      {
        id: 'demo-3',
        title: 'Crônicas Saxônicas',
        author: 'Bernard Cornwell',
        category: 'História',
        price: 35.00,
        condition: 'Bom estado',
        availabilityStatus: 'ativo' as const,
        isbn: '9780007218011',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780007218011-L.jpg',
        description: 'Série de romances históricos que acompanham a formação da Inglaterra nos séculos IX e X.',
        pages: 416,
        year: 2015,
        sebo: {
          name: 'Livraria Releitura',
          city: 'São Paulo',
          state: 'SP',
          whatsapp: '5511999999999'
        }
      },
      {
        id: 'demo-4',
        title: 'As Duas Torres',
        author: 'J.R.R. Tolkien',
        category: 'Fantasia',
        price: 42.00,
        condition: 'Excelente',
        availabilityStatus: 'ativo' as const,
        isbn: '9788595084759',
        coverUrl: '/covers/as-duas-torres.svg',
        description: 'Segundo volume da trilogia O Senhor dos Anéis, onde a sociedade do anel se divide.',
        pages: 464,
        year: 2001,
        sebo: {
          name: 'Livraria Releitura',
          city: 'São Paulo',
          state: 'SP',
          whatsapp: '5511999999999'
        }
      },
      {
        id: 'demo-5',
        title: 'A Quarta Asa',
        author: 'Rebecca Yarros',
        category: 'Fantasia',
        price: 38.00,
        condition: 'Bom estado',
        availabilityStatus: 'ativo' as const,
        isbn: '9781649374042',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9781649374042-L.jpg',
        description: 'Romance de fantasia com dragões e treinamento militar em uma academia de cavaleiros.',
        pages: 480,
        year: 2023,
        sebo: {
          name: 'Sebo do Porto',
          city: 'Porto Alegre',
          state: 'RS',
          whatsapp: '5551999999999'
        }
      },
      {
        id: 'demo-6',
        title: 'Harry Potter e a Pedra Filosofal',
        author: 'J.K. Rowling',
        category: 'Fantasia',
        price: 35.00,
        condition: 'Bom estado',
        availabilityStatus: 'ativo' as const,
        isbn: '9788532511010',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9788532511010-L.jpg',
        description: 'Primeiro livro da saga Harry Potter, sobre um jovem bruxo que descobre seu destino.',
        pages: 223,
        year: 1997,
        sebo: {
          name: 'Livraria Releitura',
          city: 'São Paulo',
          state: 'SP',
          whatsapp: '5511999999999'
        }
      }
    ];

    const demoBook = demoBooks.find(b => b.id === id);
    
    if (!demoBook) {
      return (
        <div className="min-h-screen flex flex-col bg-white">
          <Header />
          <main className="container flex-1 py-12 flex items-center justify-center">
            <div className="text-center">
              <p className="font-outfit font-bold text-2xl text-[#262969] mb-4">Livro não encontrado</p>
              <Link href="/" className="text-[#da4653] hover:underline font-inter font-medium">
                Voltar ao catálogo
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    const whatsappNumber = demoBook.sebo?.whatsapp || WHATSAPP_DEFAULT;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá! Tenho interesse no livro "${demoBook.title}". Ainda está disponível?`;
    const demoAvailabilityStatus = demoBook.availabilityStatus as
      | "ativo"
      | "reservado"
      | "vendido";

    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />

        <main className="container flex-1 py-12">
          {/* Back Button */}
          <Link href="/">
            <button className="flex items-center gap-2 text-gray-600 hover:text-[#262969] transition-colors font-inter text-sm font-medium mb-8">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao catálogo
            </button>
          </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Mobile Floating Cover */}
          <div className="md:hidden fixed top-24 right-3 z-40 rounded-md overflow-hidden border border-gray-200 bg-white shadow-lg aspect-[2/3] w-20">
            <BookCover
              isbn={demoBook.isbn}
              title={demoBook.title}
              author={demoBook.author}
              coverUrl={demoBook.coverUrl}
              className="w-full h-full"
            />
          </div>

          {/* Book Image */}
          <div className="md:col-span-1">
              <div className="rounded-lg overflow-hidden border border-gray-200 relative aspect-[2/3] w-1/2 sm:w-1/3 md:w-full max-w-xs mx-auto md:sticky md:top-24">
                <BookCover
                  isbn={demoBook.isbn}
                  title={demoBook.title}
                  author={demoBook.author}
                  coverUrl={demoBook.coverUrl}
                  className="w-full h-full"
                />
                
                {/* Botão de favorito na imagem */}
                <button
                  onClick={() => {
                    if (favoriteId) {
                      toggleFavorite(favoriteId);
                    }
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all z-10"
                  title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Heart
                    className={`w-6 h-6 transition-colors ${
                      favorited ? "fill-[#da4653] text-[#da4653]" : "text-gray-400 hover:text-[#da4653]"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Book Details */}
            <div className="md:col-span-2">
              {/* Title and Category */}
              <h1 className="font-outfit font-bold text-3xl text-[#262969] mb-2">
                {demoBook.title}
              </h1>
              
              {/* Author */}
              {demoBook.author && (
                <p className="font-inter text-lg text-gray-600 mb-4">
                  por <span className="font-semibold text-[#262969]">{demoBook.author}</span>
                </p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-xs font-inter bg-gray-100 px-3 py-1 rounded text-gray-700">
                  {demoBook.category}
                </span>
                <span className="text-xs font-inter bg-[#da4653] px-3 py-1 rounded text-white font-semibold">
                  {demoBook.condition}
                </span>
                <span className="text-xs font-inter bg-emerald-600 px-3 py-1 rounded text-white font-semibold">
                  {demoAvailabilityStatus === "vendido"
                    ? "Vendido"
                    : demoAvailabilityStatus === "reservado"
                    ? "Reservado"
                    : "Disponivel"}
                </span>
              </div>

              {/* Price */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <p className="font-inter text-sm text-gray-600 mb-2">Preço</p>
                <p className="font-outfit font-bold text-4xl text-[#da4653]">
                  R$ {demoBook.price.toFixed(2)}
                </p>
              </div>

              {/* Description */}
              {demoBook.description && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-3">Descrição</h2>
                  <p className="font-inter text-gray-700 leading-relaxed text-base">
                    {demoBook.description}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
                {demoBook.isbn && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-[#da4653]" />
                      <p className="font-inter text-sm text-gray-600">ISBN</p>
                    </div>
                    <p className="font-inter font-semibold text-gray-900 ml-6">{demoBook.isbn}</p>
                  </div>
                )}
                {demoBook.pages && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-[#da4653]" />
                      <p className="font-inter text-sm text-gray-600">Páginas</p>
                    </div>
                    <p className="font-inter font-semibold text-gray-900 ml-6">{demoBook.pages}</p>
                  </div>
                )}
                {demoBook.year && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[#da4653]" />
                      <p className="font-inter text-sm text-gray-600">Ano de Publicação</p>
                    </div>
                    <p className="font-inter font-semibold text-gray-900 ml-6">{demoBook.year}</p>
                  </div>
                )}
                <div>
                  <p className="font-inter text-sm text-gray-600 mb-2">Condição</p>
                  <p className="font-inter font-semibold text-gray-900">{demoBook.condition}</p>
                </div>
              </div>

              {/* Seller Info */}
              {demoBook.sebo && (
                <div className="bg-gradient-to-br from-[#da4653] to-[#c23a45] rounded-lg p-6 mb-8 border border-[#da4653] text-white">
                  <h3 className="font-outfit font-semibold text-lg mb-4">Informações do Sebo</h3>
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-5 h-5" />
                    <div>
                      <p className="font-inter text-sm opacity-90">Sebo</p>
                      <p className="font-inter font-semibold text-base">{demoBook.sebo.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-white/20 rounded p-2">
                      <p className="text-xs opacity-90">Nota</p>
                      <p className="font-bold">4.7</p>
                    </div>
                    <div className="bg-white/20 rounded p-2">
                      <p className="text-xs opacity-90">Resposta</p>
                      <p className="font-bold">~1h</p>
                    </div>
                    <div className="bg-white/20 rounded p-2">
                      <p className="text-xs opacity-90">Catalogo</p>
                      <p className="font-bold">+20</p>
                    </div>
                  </div>
                  <p className="font-inter text-sm opacity-90">
                    Entre em contato diretamente via WhatsApp para confirmar disponibilidade e negociar o melhor preço.
                  </p>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 mb-8">
                <button
                  onClick={() => {
                    const demoNumericId = Number.parseInt((id || "").replace("demo-", ""), 10);
                    if (Number.isFinite(demoNumericId) && demoNumericId > 0) {
                      void handleInterest(demoNumericId, demoBook.title);
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full bg-[#262969] hover:bg-[#1e2157] text-white font-outfit font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Tenho Interesse
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#da4653] hover:bg-[#c23a45] text-white font-outfit font-bold py-4 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contatar via WhatsApp
                </a>
                <button
                  onClick={() => {
                    if (favoriteId) {
                      toggleFavorite(favoriteId);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 w-full font-outfit font-bold py-3 px-6 rounded-lg transition-all border-2 ${
                    favorited
                      ? "bg-[#da4653] border-[#da4653] text-white"
                      : "bg-white border-[#da4653] text-[#da4653] hover:bg-[#da4653] hover:text-white"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorited ? "fill-current" : ""}`} />
                  {favorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                </button>
              </div>

              {/* Additional Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-inter text-sm text-blue-900">
                  <span className="font-semibold">💡 Dica:</span> Confirme a disponibilidade antes de se deslocar até o sebo. Muitos livros são vendidos rapidamente!
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12 flex items-center justify-center">
          <div className="text-center">
            <p className="font-outfit font-bold text-2xl text-[#262969] mb-4">Livro não encontrado</p>
            <Link href="/" className="text-[#da4653] hover:underline font-inter font-medium">
              Voltar ao catálogo
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const whatsappNumber = book.sebo?.whatsapp || WHATSAPP_DEFAULT;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá! Tenho interesse no livro "${book.title}". Ainda está disponível?`;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="container flex-1 py-12">
        {/* Back Button */}
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-600 hover:text-[#262969] transition-colors font-inter text-sm font-medium mb-8">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Mobile Floating Cover */}
          <div className="md:hidden fixed top-24 right-3 z-40 rounded-md overflow-hidden border border-gray-200 bg-white shadow-lg aspect-[2/3] w-20">
            <BookCover
              isbn={book.isbn}
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              className="w-full h-full"
            />
          </div>

          {/* Book Image */}
          <div className="md:col-span-1">
            <div className="rounded-lg overflow-hidden border border-gray-200 relative aspect-[2/3] w-1/2 sm:w-1/3 md:w-full max-w-xs mx-auto md:sticky md:top-24">
              <BookCover
                isbn={book.isbn}
                title={book.title}
                author={book.author}
                coverUrl={book.coverUrl}
                className="w-full h-full"
              />
              
              {/* Botão de favorito na imagem */}
              <button
                onClick={() => toggleFavorite(book.id)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all z-10"
                title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Heart
                  className={`w-6 h-6 transition-colors ${
                    favorited ? "fill-[#da4653] text-[#da4653]" : "text-gray-400 hover:text-[#da4653]"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2">
            {/* Title and Category */}
            <h1 className="font-outfit font-bold text-3xl text-[#262969] mb-2">
              {book.title}
            </h1>
            
            {/* Author */}
            {book.author && (
              <p className="font-inter text-lg text-gray-600 mb-4">
                por <span className="font-semibold text-[#262969]">{book.author}</span>
              </p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="text-xs font-inter bg-gray-100 px-3 py-1 rounded text-gray-700">
                {book.category}
              </span>
              <span className="text-xs font-inter bg-[#da4653] px-3 py-1 rounded text-white font-semibold">
                {book.condition}
              </span>
              <span
                className={`text-xs font-inter px-3 py-1 rounded text-white font-semibold ${
                  book.availabilityStatus === "vendido"
                    ? "bg-gray-800"
                    : book.availabilityStatus === "reservado"
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
              >
                {book.availabilityStatus === "vendido"
                  ? "Vendido"
                  : book.availabilityStatus === "reservado"
                  ? "Reservado"
                  : "Disponivel"}
              </span>
            </div>

            {/* Price */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <p className="font-inter text-sm text-gray-600 mb-2">Preço</p>
              <p className="font-outfit font-bold text-4xl text-[#da4653]">
                R$ {parseFloat(book.price as unknown as string).toFixed(2)}
              </p>
            </div>

            {/* Description */}
            {book.description && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-3">Descrição</h2>
                <p className="font-inter text-gray-700 leading-relaxed text-base">
                  {book.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
              {book.isbn && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#da4653]" />
                    <p className="font-inter text-sm text-gray-600">ISBN</p>
                  </div>
                  <p className="font-inter font-semibold text-gray-900 ml-6">{book.isbn}</p>
                </div>
              )}
              {book.pages && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-[#da4653]" />
                    <p className="font-inter text-sm text-gray-600">Páginas</p>
                  </div>
                  <p className="font-inter font-semibold text-gray-900 ml-6">{book.pages}</p>
                </div>
              )}
              {book.year && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#da4653]" />
                    <p className="font-inter text-sm text-gray-600">Ano de Publicação</p>
                  </div>
                  <p className="font-inter font-semibold text-gray-900 ml-6">{book.year}</p>
                </div>
              )}
              <div>
                <p className="font-inter text-sm text-gray-600 mb-2">Condição</p>
                <p className="font-inter font-semibold text-gray-900">{book.condition}</p>
              </div>
            </div>

            {/* Seller Info */}
            {book.sebo && (
              <div className="bg-gradient-to-br from-[#da4653] to-[#c23a45] rounded-lg p-6 mb-8 border border-[#da4653] text-white">
                <h3 className="font-outfit font-semibold text-lg mb-4">Informações do Sebo</h3>
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5" />
                  <div>
                    <p className="font-inter text-sm opacity-90">Sebo</p>
                    <p className="font-inter font-semibold text-base">{book.sebo.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div className="bg-white/20 rounded p-2">
                    <p className="text-xs opacity-90">Nota</p>
                    <p className="font-bold">{book.seboStats?.score?.toFixed?.(1) ?? "4.5"}</p>
                  </div>
                  <div className="bg-white/20 rounded p-2">
                    <p className="text-xs opacity-90">Resposta</p>
                    <p className="font-bold">{book.seboStats?.responseTime ?? "~2h"}</p>
                  </div>
                  <div className="bg-white/20 rounded p-2">
                    <p className="text-xs opacity-90">Catalogo</p>
                    <p className="font-bold">{book.seboStats?.totalBooks ?? "-"}</p>
                  </div>
                </div>
                <p className="font-inter text-sm opacity-90">
                  Entre em contato diretamente via WhatsApp para confirmar disponibilidade e negociar o melhor preço.
                </p>
              </div>
            )}

            {/* CTA Buttons */}
              <div className="flex flex-col gap-3 mb-8">
              <button
                onClick={() => void handleInterest(book.id, book.title)}
                className="flex items-center justify-center gap-2 w-full bg-[#262969] hover:bg-[#1e2157] text-white font-outfit font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Tenho Interesse
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full text-white font-outfit font-bold py-4 px-6 rounded-lg transition-colors shadow-md ${
                  book.availabilityStatus === "vendido"
                    ? "bg-gray-400 pointer-events-none"
                    : "bg-[#da4653] hover:bg-[#c23a45] hover:shadow-lg"
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                {book.availabilityStatus === "vendido"
                  ? "Livro Vendido"
                  : "Contatar via WhatsApp"}
              </a>
              <button
                onClick={() => toggleFavorite(book.id)}
                className={`flex items-center justify-center gap-2 w-full font-outfit font-bold py-3 px-6 rounded-lg transition-all border-2 ${
                  favorited
                    ? "bg-[#da4653] border-[#da4653] text-white"
                    : "bg-white border-[#da4653] text-[#da4653] hover:bg-[#da4653] hover:text-white"
                }`}
              >
                <Heart className={`w-5 h-5 ${favorited ? "fill-current" : ""}`} />
                {favorited ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
              </button>
            </div>

            {/* Additional Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-inter text-sm text-blue-900">
                <span className="font-semibold">💡 Dica:</span> Confirme a disponibilidade antes de se deslocar até o sebo. Muitos livros são vendidos rapidamente!
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
