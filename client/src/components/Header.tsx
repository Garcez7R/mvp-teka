import { useState } from "react";
import { Link } from "wouter";
import { Menu, X, BookOpen, Info, LogIn, Shield, Library, PlusCircle, LogOut, Heart, Settings } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { hasAnyAuthSession } from "@/lib/session";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, role, user, logout } = useAuth();
  const hasToken = hasAnyAuthSession();
  const displayName = user?.name?.trim() || user?.email?.trim() || "Usuário";
  const roleLabel =
    role === "admin" ? "Admin" : role === "livreiro" ? "Livreiro" : role === "comprador" ? "Comprador" : "Usuário";

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const resetCatalog = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("teka:reset-catalog"));
    }
  };
  const handleHomeClick = (event?: { preventDefault?: () => void }) => {
    if (typeof window === "undefined") return;
    const isAlreadyHome = window.location.pathname === "/";

    resetCatalog();
    if (isAlreadyHome) {
      event?.preventDefault?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
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
            handleHomeClick();
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
            onClick={() => handleHomeClick()}
            className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium"
          >
            Início
          </Link>
          <Link href="/sebos" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
            Sebos
          </Link>
          {isAuthenticated && (role === "livreiro" || role === "admin") && (
            <>
              <Link href="/add-book" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
                Cadastrar Livro
              </Link>
              <Link href="/manage-books" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
                Meu Catálogo
              </Link>
              <Link href="/batch-scan" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
                Scan em Lote
              </Link>
            </>
          )}
          {isAuthenticated && role !== "livreiro" && (
            <Link href="/my-interests" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Favoritos e Interesses
            </Link>
          )}
          {isAuthenticated && role === "admin" && (
            <Link href="/admin" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Admin
            </Link>
          )}
          {isAuthenticated && (
            <Link href="/settings" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
              Configurações
            </Link>
          )}
          <Link href="/about" className="text-[#262969] hover:text-[#da4653] transition-all font-inter text-sm font-medium">
            Sobre
          </Link>
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
                Sair da conta
              </button>
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
        <div className="teka-mobile-menu md:hidden absolute top-16 left-0 w-full max-h-[calc(100vh-4rem)] overflow-y-auto bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top duration-200">
          <nav className="container py-6 flex flex-col gap-4">
            <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-white/95 backdrop-blur border-b border-gray-200 flex justify-end">
              <button
                onClick={closeMenu}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 text-[#262969] hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Fechar menu
              </button>
            </div>
            <Link 
              href="/" 
              onClick={(event) => {
                handleHomeClick(event);
                closeMenu();
              }}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <BookOpen className="w-5 h-5 text-[#da4653]" />
              Início
            </Link>

            <Link
              href="/sebos"
              onClick={closeMenu}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <Library className="w-5 h-5 text-[#da4653]" />
              Sebos
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
                  Meu Catálogo
                </Link>
                <Link
                  href="/batch-scan"
                  onClick={closeMenu}
                  className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
                >
                  <PlusCircle className="w-5 h-5 text-[#da4653]" />
                  Scan em Lote
                </Link>
              </>
            )}
            {isAuthenticated && role !== "livreiro" && (
              <Link
                href="/my-interests"
                onClick={closeMenu}
                className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
              >
                <Heart className="w-5 h-5 text-[#da4653]" />
                Favoritos e Interesses
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
            <Link
              href="/about"
              onClick={closeMenu}
              className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
            >
              <Info className="w-5 h-5 text-[#da4653]" />
              Sobre
            </Link>
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
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={() => {
                    closeMenu();
                    void handleLogout();
                  }}
                  className="flex items-center gap-3 text-[#262969] font-inter font-medium p-3 hover:bg-gray-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5 text-[#da4653]" />
                  Sair da conta
                </button>
              </>
            )}
            <div className="pt-2 mt-1 border-t border-gray-200">
              <button
                onClick={closeMenu}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#262969] font-inter font-medium hover:bg-gray-50"
              >
                Fechar menu
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
