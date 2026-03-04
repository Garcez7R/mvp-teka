import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Menu, X, PlusCircle, BookOpen, Info, LogIn, User } from "lucide-react";

export default function Header() {
  const { isAuthenticated, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" onClick={closeMenu} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/teka-logo.png" alt="TEKA" className="w-10 h-10 object-contain" />
          <span className="font-outfit font-bold text-xl text-[#262969]">TEKA</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
            Catálogo
          </Link>
          
          {isAuthenticated && (
            <>
              <Link href="/manage-books" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
                Meus Livros
              </Link>
              <Link href="/add-book" className="flex items-center gap-1 text-white bg-[#da4653] hover:bg-[#c23a45] px-4 py-2 rounded-lg transition-all font-inter text-sm font-medium">
                <PlusCircle className="w-4 h-4" />
                Cadastrar Livro
              </Link>
            </>
          )}
          
          <Link href="/about" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
            Sobre
          </Link>

          {!isAuthenticated ? (
            <a
              href={getLoginUrl()}
              className="text-[#262969] hover:text-white hover:bg-[#262969] transition-all font-inter text-sm font-medium border border-[#262969] px-4 py-2 rounded-lg"
            >
              Login
            </a>
          ) : (
            <div className="flex items-center gap-2 text-[#262969] font-inter text-sm font-semibold bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
              <User className="w-4 h-4 text-[#da4653]" />
              <span>Olá, {user?.name?.split(" ")[0] || "Usuário"}</span>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={toggleMenu}
            className="text-[#262969] p-2 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top duration-200">
          <nav className="container py-6 flex flex-col gap-4">
            <Link 
              href="/" 
              onClick={closeMenu}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <BookOpen className="w-5 h-5 text-[#da4653]" />
              Catálogo
            </Link>
            
            {isAuthenticated && (
              <>
                <Link 
                  href="/manage-books" 
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
                >
                  <User className="w-5 h-5 text-[#da4653]" />
                  Meus Livros
                </Link>
                <Link 
                  href="/add-book" 
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-white bg-[#da4653] font-inter font-medium p-3 rounded-lg shadow-md"
                >
                  <PlusCircle className="w-5 h-5" />
                  Cadastrar Livro
                </Link>
              </>
            )}
            
            <Link 
              href="/about" 
              onClick={closeMenu}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <Info className="w-5 h-5 text-[#da4653]" />
              Sobre
            </Link>

            <div className="pt-4 border-t border-gray-100">
              {!isAuthenticated ? (
                <a
                  href={getLoginUrl()}
                  className="flex items-center justify-center gap-2 w-full text-white bg-[#262969] font-inter font-bold py-3 rounded-lg"
                >
                  <LogIn className="w-5 h-5" />
                  Fazer Login
                </a>
              ) : (
                <div className="text-center py-2 text-[#262969] font-inter font-semibold">
                  Logado como {user?.name || "Usuário"}
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
