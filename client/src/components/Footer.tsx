import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_DEFAULT } from "@/const";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#262969] text-white mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="font-outfit font-bold text-lg mb-2"><span className="text-[#da4653]">TEKA</span></h3>
            <p className="font-inter text-sm text-gray-300">
              Marketplace de livros usados. Encontre, busque e compre com segurança.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-outfit font-semibold mb-4">Links</h4>
            <ul className="space-y-2 font-inter text-sm">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/add-book" className="text-gray-300 hover:text-white transition-colors">
                  Cadastrar Livro
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
                  Sobre
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-outfit font-semibold mb-4">Contato</h4>
            <a
              href={`https://wa.me/${WHATSAPP_DEFAULT}?text=Olá! Tenho uma dúvida sobre o TEKA`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#da4653] hover:bg-[#c23a45] px-4 py-2 rounded-lg transition-colors font-inter text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Chat WhatsApp
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <p className="font-inter text-sm text-gray-400 text-center">
            © {currentYear} TEKA. Todos os direitos reservados. | Versão 1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
