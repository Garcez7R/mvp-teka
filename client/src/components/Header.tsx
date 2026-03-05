import { useState } from "react";
import { Link } from "wouter";
import { Menu, X, BookOpen, Info, LogIn, Shield, Library, PlusCircle, LogOut, Heart, Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getSessionIdToken } from "@/lib/session";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, role, user, logout } = useAuth();
  const hasToken = Boolean(getSessionIdToken());
  const displayName = user?.name?.trim() || user?.email?.trim() || "Usuário";
  const roleLabel =
    role === "admin" ? "Admin" : role === "livreiro" ? "Livreiro" : "Comprador";

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const resetCatalog = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("teka:reset-catalog"));
    }
  };
  const handleLogout = async () => {
    await logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#da4653] border-b border-gray-200 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          onClick={() => {
            resetCatalog();
            closeMenu();
          }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <img src="/teka-logo.png" alt="TEKA" className="w-10 h-10 object-contain" />
          <span className="font-outfit font-bold text-xl text-[#262969]">TEKA</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/"
            onClick={resetCatalog}
            className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium"
          >
            Catálogo
          </Link>
          {isAuthenticated && (role === "livreiro" || role === "admin") && (
            <>
              <Link href="/add-book" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
                Cadastrar Livro
              </Link>
              <Link href="/manage-books" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
                Meus Livros
              </Link>
            </>
          )}
          {isAuthenticated && (
            <Link href="/my-interests" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Meus Interesses
            </Link>
          )}
          {isAuthenticated && (
            <Link href="/settings" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Configurações
            </Link>
          )}
          {isAuthenticated && role === "admin" && (
            <Link href="/admin" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Admin
            </Link>
          )}
          {!isAuthenticated ? (
            <Link href="/login" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Entrar
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="font-inter text-xs text-[#262969]">Logado como</p>
                <p className="font-inter text-sm font-semibold text-[#262969] max-w-[180px] truncate">
                  {displayName}
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                {hasToken ? "Sessão ativa" : "Sincronizando"}
              </span>
              <span className="px-2 py-1 rounded bg-white/70 text-[#262969] text-xs font-semibold">
                {roleLabel}
              </span>
              <button
                onClick={() => void handleLogout()}
                className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium"
              >
                Sair
              </button>
            </div>
          )}
          <Link href="/about" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
            Sobre
          </Link>
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
              onClick={() => {
                resetCatalog();
                closeMenu();
              }}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <BookOpen className="w-5 h-5 text-[#da4653]" />
              Catálogo
            </Link>
            
            <Link 
              href="/about" 
              onClick={closeMenu}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <Info className="w-5 h-5 text-[#da4653]" />
              Sobre
            </Link>
            {isAuthenticated && (role === "livreiro" || role === "admin") && (
              <>
                <Link
                  href="/add-book"
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
                >
                  <PlusCircle className="w-5 h-5 text-[#da4653]" />
                  Cadastrar Livro
                </Link>
                <Link
                  href="/manage-books"
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
                >
                  <Library className="w-5 h-5 text-[#da4653]" />
                  Meus Livros
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link
                href="/my-interests"
                onClick={closeMenu}
                className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
              >
                <Heart className="w-5 h-5 text-[#da4653]" />
                Meus Interesses
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/settings"
                onClick={closeMenu}
                className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
              >
                <Settings className="w-5 h-5 text-[#da4653]" />
                Configurações
              </Link>
            )}
            {isAuthenticated && role === "admin" && (
              <Link
                href="/admin"
                onClick={closeMenu}
                className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
              >
                <Shield className="w-5 h-5 text-[#da4653]" />
                Admin
              </Link>
            )}
            {!isAuthenticated ? (
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
              >
                <LogIn className="w-5 h-5 text-[#da4653]" />
                Entrar
              </Link>
            ) : (
              <>
                <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="font-inter text-xs text-gray-500">Logado como</p>
                  <p className="font-inter text-sm font-semibold text-[#262969] truncate">
                    {displayName}
                  </p>
                  <p className="font-inter text-xs text-green-700 font-semibold mt-1">
                    {hasToken ? "Sessão ativa" : "Sincronizando sessão"}
                  </p>
                  <p className="font-inter text-xs text-[#da4653] font-semibold mt-1">
                    Perfil: {roleLabel}
                  </p>
                </div>
                <button
                  onClick={() => {
                    closeMenu();
                    void handleLogout();
                  }}
                  className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5 text-[#da4653]" />
                  Sair
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
