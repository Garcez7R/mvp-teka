import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="container flex-1 flex items-center justify-center py-12">
        <div className="text-center">
          <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h1 className="font-outfit font-bold text-4xl text-[#262969] mb-2">
            404
          </h1>
          <p className="font-inter text-xl text-gray-700 mb-2">
            Página não encontrada
          </p>
          <p className="font-inter text-gray-600 mb-8">
            Desculpe, a página que você está procurando não existe.
          </p>
          <Link href="/">
            <button className="bg-[#da4653] hover:bg-[#c23a45] text-white font-outfit font-bold py-3 px-8 rounded-lg transition-colors">
              Voltar ao Catálogo
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
