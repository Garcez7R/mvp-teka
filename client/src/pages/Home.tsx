import { useState, useMemo } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BookCard from "@/components/BookCard";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Filter, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSebo, setSelectedSebo] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { getFavoriteCount } = useFavorites();

  // Fetch books from API
  const { data: booksData = [] } = trpc.books.list.useQuery({
    search: searchQuery,
    category: selectedCategory || undefined,
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
          isbn: '9788535923148',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9788535923148-L.jpg',
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
          sebo: {
            name: 'Sebo do Porto',
            city: 'Porto Alegre',
            state: 'RS'
          }
        },
        {
          id: 'demo-3',
          title: 'O Pequeno Príncipe',
          author: 'Antoine de Saint-Exupéry',
          category: 'Infantil',
          price: 18.00,
          condition: 'Usado',
          isbn: '9788522031436',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9788522031436-L.jpg',
          sebo: {
            name: 'Livraria Releitura',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        {
          id: 'demo-4',
          title: 'Sapiens: Uma Breve História da Humanidade',
          author: 'Yuval Noah Harari',
          category: 'História',
          price: 45.00,
          condition: 'Excelente',
          isbn: '9788525432186',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9788525432186-L.jpg',
          sebo: {
            name: 'Livraria Releitura',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        {
          id: 'demo-5',
          title: 'O Alquimista',
          author: 'Paulo Coelho',
          category: 'Literatura Brasileira',
          price: 20.00,
          condition: 'Bom estado',
          isbn: '9788575427583',
          coverUrl: 'https://covers.openlibrary.org/b/isbn/9788575427583-L.jpg',
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

  // Get unique categories and sebos from the data
  const categories = useMemo(() => Array.from(new Set(booksData.map((b: any) => b.category).filter(Boolean))), [booksData]);
  const sebos = useMemo(() => Array.from(new Set(booksData.map((b: any) => b.sebo?.name || "").filter(Boolean))), [booksData]);

  // Filter books locally (search comes from API already)
  const filteredBooks = useMemo(() => {
    return booksData.filter((book: any) => {
      const matchesCategory = !selectedCategory || book.category === selectedCategory;
      const matchesSebo = !selectedSebo || book.sebo?.name === selectedSebo;
      return matchesCategory && matchesSebo;
    });
  }, [booksData, selectedCategory, selectedSebo]);

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
            <SearchBar onSearch={setSearchQuery} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container flex-1 py-12">
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
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#262969] rounded-lg hover:bg-[#262969] hover:text-white transition-colors font-inter text-sm font-medium text-[#262969]"
            title="Ver livros favoritos"
          >
            <Heart className="w-4 h-4" />
            Favoritos ({getFavoriteCount()})
          </button>
        </div>

        {showFilters && (
            <div className="mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            </div>
          )}

        {/* Results Count */}
        <div className="mb-6">
          <p className="font-inter text-sm text-gray-600">
            <span className="font-semibold text-[#262969]">{filteredBooks.length}</span> livro(s) encontrado(s)
          </p>
        </div>

        {/* Books Grid */}
        {displayBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayBooks.map((book: any) => (
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
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="font-inter text-gray-600 mb-2">Nenhum livro encontrado</p>
            <p className="font-inter text-sm text-gray-500">Tente ajustar seus filtros ou busca</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
