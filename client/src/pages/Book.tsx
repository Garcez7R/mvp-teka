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

  // Se for um livro de demonstração (id começa com 'demo-'), exibir informações de demonstração
  if (id?.startsWith('demo-')) {
    const demoBooks = [
      {
        id: 'demo-1',
        title: 'Dom Casmurro',
        author: 'Machado de Assis',
        category: 'Literatura Brasileira',
        price: 25.00,
        condition: 'Bom estado',
        isbn: '9788535923148',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9788535923148-L.jpg',
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
        isbn: '9788576863123',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9788576863123-L.jpg',
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
        isbn: '9788535905220',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9788535905220-L.jpg',
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
        isbn: '9786555612345',
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9786555612345-L.jpg',
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
            {/* Book Image */}
            <div className="md:col-span-1">
              <div className="rounded-lg overflow-hidden border border-gray-200 sticky top-24 relative h-96">
                <BookCover isbn={demoBook.isbn} title={demoBook.title} coverUrl={demoBook.coverUrl} className="w-full h-full" />
                
                {/* Botão de favorito na imagem */}
                <button
                  onClick={() => toggleFavorite(parseInt(id.replace('demo-', '')))}
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
                  onClick={() => toggleFavorite(parseInt(id.replace('demo-', '')))}
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
