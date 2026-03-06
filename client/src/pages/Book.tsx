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
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const parsedBookId = Number.parseInt(id || "", 10);
  const favoriteId = Number.isFinite(parsedBookId) && parsedBookId > 0 ? parsedBookId : null;

  const { data: book, isLoading, error } = trpc.books.getById.useQuery(parsedBookId, {
    enabled: Number.isFinite(parsedBookId) && parsedBookId > 0,
  });
  const { data: similarBooks = [] } = trpc.books.list.useQuery(
    {
      category: book?.category || undefined,
      limit: 12,
      offset: 0,
      includeHidden: false,
      sortBy: "recent",
    },
    {
      enabled: Boolean(book?.id),
      refetchOnWindowFocus: false,
    }
  );
  const registerInterestMutation = trpc.books.registerInterest.useMutation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = favoriteId ? isFavorite(favoriteId) : false;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    const selectedTitle = book?.title;
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
      trackEvent("book_view", { title: selectedTitle });
    }
  }, [book?.title]);

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
        const wait = (ms: number) =>
          new Promise((resolve) => window.setTimeout(resolve, ms));

        const trySyncAndRetry = async () => {
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            const tokenNow = getSessionIdToken();
            if (!tokenNow) {
              if (attempt < 3) {
                await wait(350 * attempt);
                continue;
              }
              break;
            }
            try {
              const retry = await registerInterestMutation.mutateAsync({ bookId });
              await utils.books.myInterests.invalidate();
              const retryTotal = retry?.totalInterests;
              toast.success(
                retryTotal && Number.isFinite(retryTotal)
                  ? `Interesse registrado. ${retryTotal} pessoa(s) interessada(s).`
                  : "Interesse registrado com sucesso."
              );
              return true;
            } catch (retryError: any) {
              const retryMessage = String(retryError?.message || "");
              const retryUnauthenticated =
                retryError?.data?.code === "UNAUTHORIZED" ||
                /not authenticated/i.test(retryMessage);
              if (!retryUnauthenticated) {
                throw retryError;
              }
              if (attempt < 3) {
                await wait(350 * attempt);
              }
            }
          }
          return false;
        };

        try {
          const success = await trySyncAndRetry();
          if (success) return;
        } catch {
          toast.error("Não foi possível validar sua sessão agora. Aguarde e tente novamente.");
          return;
        }
        toast.error("Sessão ainda não sincronizada. Aguarde alguns segundos e tente novamente.");
        return;
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

  const whatsappNumber = (book.sebo?.whatsapp || WHATSAPP_DEFAULT).replace(/\D/g, "");
  const liveWhatsappMessage = encodeURIComponent(
    `Olá! Tenho interesse no livro "${book.title}" (${book.author || "Autor desconhecido"}).\n` +
      `Preço anunciado: R$ ${Number(book.price).toFixed(2)}.\n` +
      `Condição: ${book.condition || "Não informada"}.\n` +
      `Sebo: ${book.sebo?.name || "TEKA"}.\n` +
      `Link: ${typeof window !== "undefined" ? window.location.href : ""}\n` +
      `Pode confirmar disponibilidade?`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${liveWhatsappMessage}`;

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
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">Sebo: {book.sebo.name}</span>
                  {book.sebo.verified && (
                    <span className="text-xs bg-emerald-600 px-2 py-1 rounded font-semibold">Verificado</span>
                  )}
                  {(book.sebo.city || book.sebo.state) && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {book.sebo.city || "-"} / {book.sebo.state || "-"}
                    </span>
                  )}
                </div>
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
                <div className="mt-4 p-3 rounded bg-white/15">
                  <p className="text-sm font-semibold mb-2">Logística de entrega</p>
                  <p className="text-xs">
                    {[
                      book.sebo.supportsPickup ? "Retirada no local" : null,
                      book.sebo.shipsNeighborhood ? "Entrega no bairro" : null,
                      book.sebo.shipsCity ? "Entrega na cidade" : null,
                      book.sebo.shipsState ? "Entrega no estado" : null,
                      book.sebo.shipsNationwide ? "Envio nacional" : null,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "Não informado"}
                  </p>
                  {book.sebo.shippingAreas && (
                    <p className="text-xs mt-1">Áreas: {book.sebo.shippingAreas}</p>
                  )}
                  {book.sebo.shippingFeeNotes && (
                    <p className="text-xs mt-1">Frete: {book.sebo.shippingFeeNotes}</p>
                  )}
                  {book.sebo.shippingEta && (
                    <p className="text-xs mt-1">Prazo: {book.sebo.shippingEta}</p>
                  )}
                  {book.sebo.shippingNotes && (
                    <p className="text-xs mt-1">Obs.: {book.sebo.shippingNotes}</p>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 mb-8">
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
                  : "Contatar Sebo"}
              </a>
              <button
                onClick={() => void handleInterest(book.id, book.title)}
                className="text-sm text-[#262969] hover:underline text-left"
              >
                Registrar interesse neste livro
              </button>
            </div>

            {/* Additional Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <p className="font-inter text-sm text-blue-900">
                <span className="font-semibold">💡 Dica:</span> Confirme a disponibilidade antes de se deslocar até o sebo. Muitos livros são vendidos rapidamente!
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-8">
              <p className="font-inter text-sm text-amber-900">
                A TEKA conecta leitores e sebos. Pagamento, entrega e condições finais são tratados diretamente com o sebo.
              </p>
            </div>

            {similarBooks.length > 0 && (
              <div>
                <h3 className="font-outfit font-semibold text-lg text-[#262969] mb-3">
                  Alternativas Semelhantes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {similarBooks
                    .filter((candidate: any) => Number(candidate.id) !== Number(book.id))
                    .filter(
                      (candidate: any) =>
                        (book.author &&
                          candidate.author &&
                          String(candidate.author).toLowerCase() ===
                            String(book.author).toLowerCase()) ||
                        candidate.category === book.category
                    )
                    .slice(0, 4)
                    .map((candidate: any) => (
                      <Link
                        key={candidate.id}
                        href={`/book/${candidate.id}`}
                        className="border border-gray-200 rounded-lg p-3 hover:border-[#da4653] transition-colors"
                      >
                        <p className="font-semibold text-[#262969] line-clamp-1">{candidate.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-1">{candidate.author || "Autor desconhecido"}</p>
                        <p className="text-sm text-[#da4653] font-semibold mt-1">
                          R$ {Number(candidate.price).toFixed(2)}
                        </p>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
