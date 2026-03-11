import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";

export default function SellerRequired() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header />
      <main className="container flex-1 py-12 flex items-center justify-center">
        <div className="text-center max-w-lg">
          <h1 className="font-outfit text-2xl font-bold text-[#262969] dark:text-gray-100 mb-2">
            Venda de livros
          </h1>
          <p className="text-gray-700 dark:text-gray-200">
            Para cadastrar livros, você precisa estar logado como livreiro e concluir o cadastro do sebo.
          </p>
          <Link href="/">
            <button className="mt-4 px-4 py-2 rounded bg-[#262969] text-white text-sm">
              Voltar para o catálogo
            </button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
