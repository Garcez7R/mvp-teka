import { useState } from "react";
import { Link } from "wouter";
import { Menu, X, PlusCircle, BookOpen, Info, User } from "lucide-react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-[#da4653] border-b border-gray-200 shadow-sm">
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
              onClick={closeMenu}
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
          </nav>
        </div>
      )}
    </header>
  );
}
