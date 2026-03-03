import { Link } from "wouter";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#da4653] border-b border-gray-200 shadow-sm">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/teka-logo.png" alt="TEKA" className="w-10 h-10 object-contain" />
          <span className="font-outfit font-bold text-lg text-[#262969]">TEKA</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-[#262969] hover:text-[#262969] hover:opacity-70 transition-all font-inter text-sm font-medium">
            Catálogo
          </Link>
          <Link href="/about" className="text-[#262969] hover:text-[#262969] hover:opacity-70 transition-all font-inter text-sm font-medium">
            Sobre
          </Link>

        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button className="text-[#262969] hover:text-[#262969] hover:opacity-70 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
