import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft, Loader2, Heart } from "lucide-react";

export default function MyInterests() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: interests = [], isLoading } = trpc.books.myInterests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (loading || isLoading) {
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
            Livros onde você clicou em "Tenho Interesse".
          </p>
        </div>

        {interests.length === 0 ? (
          <div className="text-center py-16 border border-gray-200 rounded-xl bg-gray-50">
            <Heart className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="font-inter text-gray-700">Você ainda não marcou interesse em nenhum livro.</p>
          </div>
        ) : (
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
        )}
      </main>
      <Footer />
    </div>
  );
}
