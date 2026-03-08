import { useParams, Link } from "wouter";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import WhatsAppLink from "@/components/WhatsAppLink";
import { WHATSAPP_DEFAULT } from "@/const";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";
import { BookOpen, MapPin, Calendar, FileText, ArrowLeft, Heart, Loader2 } from "lucide-react";
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
  const { data: offersForComparison = [] } = trpc.books.list.useQuery(
    {
      search: book?.isbn || book?.title || undefined,
      limit: 24,
      offset: 0,
      includeHidden: false,
      sortBy: "price_asc",
    },
    {
      enabled: Boolean(book?.id),
      refetchOnWindowFocus: false,
    }
  );
  const registerInterestMutation = trpc.books.registerInterest.useMutation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = favoriteId ? isFavorite(favoriteId) : false;
  const [showSeboDetails, setShowSeboDetails] = useState(false);

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
  const normalizedBookIsbn = String(book.isbn || "").replace(/\D/g, "");
  const normalizedBookTitle = String(book.title || "").trim().toLowerCase();
  const seboLogoUrl = String((book.sebo as any)?.logoUrl || "").trim() || undefined;
  const sameBookOffers = offersForComparison
    .filter((candidate: any) => Number(candidate.id) !== Number(book.id))
    .filter((candidate: any) => {
      const candidateIsbn = String(candidate.isbn || "").replace(/\D/g, "");
      const candidateTitle = String(candidate.title || "").trim().toLowerCase();
      if (normalizedBookIsbn && candidateIsbn) {
        return candidateIsbn === normalizedBookIsbn;
      }
      return candidateTitle === normalizedBookTitle;
    })
    .slice(0, 6);

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
              <div className="rounded-lg p-4 mb-8 border border-[#da4653]/40 dark:border-[#da4653]/50 bg-[#fff1f3] dark:bg-[#2a1217]">
                <h3 className="font-outfit font-semibold text-base text-[#262969] mb-3">Informações do Sebo</h3>
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-md overflow-hidden border border-gray-200 bg-white shrink-0 flex items-center justify-center">
                    {seboLogoUrl ? (
                      <img
                        src={seboLogoUrl}
                        alt={`Logo de ${book.sebo.name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src="/teka-logo.png"
                        alt="Logo TEKA"
                        className="w-full h-full object-contain p-1"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-inter font-semibold text-[#262969] truncate">{book.sebo.name}</p>
                      {book.sebo.verified && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 px-2 py-0.5 rounded font-semibold">
                          Verificado
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          book.sebo.plan === "gold"
                            ? "bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                            : book.sebo.plan === "pro"
                            ? "bg-[#da4653] text-[#262969] dark:bg-[#262969] dark:text-[#f3f4f6]"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                        }`}
                      >
                        {book.sebo.plan === "gold" ? "Sebo Gold" : book.sebo.plan === "pro" ? "Sebo Pro" : "Sebo Free"}
                      </span>
                      {(book.sebo.city || book.sebo.state) && (
                        <span className="text-[10px] bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                          {book.sebo.city || "-"} / {book.sebo.state || "-"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                        Catálogo: {book.seboStats?.totalBooks ?? "-"}
                      </span>
                      <span className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                        {book.sebo.supportsPickup ? "Retirada no local" : "Sem retirada presencial"}
                      </span>
                    </div>
                    <p className="font-inter text-xs text-gray-700 dark:text-gray-200 mt-2">
                      Contato e negociação direto com o sebo via WhatsApp.
                    </p>
                    <div className="mt-2">
                      <Link
                        href={(book.sebo.plan === "pro" || book.sebo.plan === "gold") && book.sebo.proSlug ? `/s/${book.sebo.proSlug}` : `/sebo/${book.sebo.id}`}
                        className="text-xs text-[#da4653] hover:underline font-semibold"
                      >
                        Ver vitrine do sebo
                      </Link>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeboDetails((prev) => !prev)}
                  className="mt-3 text-xs font-semibold text-[#262969] dark:text-gray-100 hover:text-[#da4653] underline"
                >
                  {showSeboDetails ? "Ocultar detalhes do sebo" : "Ver mais detalhes do sebo"}
                </button>
                {showSeboDetails ? (
                  <div className="mt-3 p-3 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-100">
                    <p className="text-sm font-semibold mb-2 text-[#262969] dark:text-gray-100">Logística de entrega</p>
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
                    {book.sebo.whatsapp && (
                      <p className="text-xs mt-1">WhatsApp público: {book.sebo.whatsapp}</p>
                    )}
                    {book.sebo.addressLine && (
                      <p className="text-xs mt-1">Endereço público: {book.sebo.addressLine}</p>
                    )}
                    <p className="text-xs mt-2 text-gray-600 dark:text-gray-300">
                      Por privacidade e segurança, o endereço completo é informado somente no atendimento direto com o sebo.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 mb-8">
              <WhatsAppLink
                href={whatsappUrl}
                iconClassName="w-5 h-5"
                className={`flex items-center justify-center gap-2 w-full text-white font-outfit font-bold py-4 px-6 rounded-lg transition-colors shadow-md ${
                  book.availabilityStatus === "vendido"
                    ? "bg-gray-400 pointer-events-none"
                    : "bg-[#25D366] hover:bg-[#1ebe5d] hover:shadow-lg"
                }`}
              >
                {book.availabilityStatus === "vendido"
                  ? "Livro Vendido"
                  : "Contatar Sebo no WhatsApp"}
              </WhatsAppLink>
              <button
                onClick={() => void handleInterest(book.id, book.title)}
                disabled={registerInterestMutation.isPending}
                className="flex items-center justify-center gap-2 w-full border border-[#da4653] text-[#262969] font-inter font-semibold py-3 px-4 rounded-lg bg-[#da4653] hover:bg-[#c23a45] hover:text-[#262969] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Heart className="w-4 h-4" />
                {registerInterestMutation.isPending
                  ? "Registrando interesse..."
                  : "Registrar interesse neste livro"}
              </button>
            </div>

            {/* Additional Info */}
            <div className="p-4 bg-blue-50 dark:bg-[#0b1220] rounded-lg border border-blue-200 dark:border-[#1e3a5f] mb-4">
              <p className="font-inter text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">💡 Dica:</span> Confirme a disponibilidade antes de se deslocar até o sebo. Muitos livros são vendidos rapidamente!
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-[#1a1407] rounded-lg border border-amber-200 dark:border-[#5b4a1d] mb-8">
              <p className="font-inter text-sm text-amber-900 dark:text-amber-100">
                A TEKA conecta leitores e sebos. Pagamento, entrega e condições finais são tratados diretamente com o sebo.
              </p>
            </div>

            {sameBookOffers.length > 0 && (
              <div className="mb-8">
                <h3 className="font-outfit font-semibold text-lg text-[#262969] mb-3">
                  Outras ofertas deste título
                </h3>
                <div className="space-y-2">
                  {sameBookOffers.map((offer: any) => (
                    <Link
                      key={offer.id}
                      href={`/book/${offer.id}`}
                      className="block border border-gray-200 rounded-lg p-3 hover:border-[#da4653] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#262969] truncate">{offer.sebo?.name || "Sebo"}</p>
                          <p className="text-xs text-gray-600 truncate">
                            {offer.sebo?.city || "-"} / {offer.sebo?.state || "-"} • {offer.condition || "Sem condição"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#da4653]">R$ {Number(offer.price).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">
                            {offer.availabilityStatus === "vendido"
                              ? "Vendido"
                              : offer.availabilityStatus === "reservado"
                              ? "Reservado"
                              : "Disponível"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
