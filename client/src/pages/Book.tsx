import { useParams, Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import { WHATSAPP_DEFAULT } from "@/const";
import { trpc } from "@/lib/trpc";
import { BookOpen, MapPin, Calendar, FileText, MessageCircle, ArrowLeft, Heart, Loader2 } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export default function Book() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id || "0");
  
  // Fetch book from API
  const { data: book, isLoading, error } = trpc.books.getById.useQuery(bookId);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(bookId);

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
          {/* Book Image */}
          <div className="md:col-span-1">
            <div className="rounded-lg overflow-hidden border border-gray-200 sticky top-24 relative h-96">
              <BookCover isbn={book.isbn} title={book.title} coverUrl={book.coverUrl} className="w-full h-full" />
              
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
                <p className="font-inter text-sm opacity-90">
                  Entre em contato diretamente via WhatsApp para confirmar disponibilidade e negociar o melhor preço.
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 mb-8">
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
