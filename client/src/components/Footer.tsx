import { Link } from "wouter";
import { WHATSAPP_DEFAULT } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import WhatsAppLink from "@/components/WhatsAppLink";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { role, hasSessionToken } = useAuth();
  const canManageCatalog = role === "livreiro" || role === "admin";
  const { data: mySebo } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: canManageCatalog || hasSessionToken,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const sellerCtaHref = canManageCatalog
    ? mySebo?.id
      ? "/add-book"
      : "/sebo/novo"
    : hasSessionToken
    ? "/sebo/novo"
    : "/login";
  const sellerCtaLabel = canManageCatalog
    ? mySebo?.id
      ? "Cadastrar Livro"
      : "Criar Sebo"
    : "Quero vender livros";

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
                  Início
                </Link>
              </li>
              <li>
                <Link href="/sebos" className="text-gray-300 hover:text-white transition-colors">
                  Sebos
                </Link>
              </li>
              {canManageCatalog ? (
                <li>
                  <Link href={sellerCtaHref} className="text-gray-300 hover:text-white transition-colors">
                    {sellerCtaLabel}
                  </Link>
                </li>
              ) : (
                <li>
                  <Link href={sellerCtaHref} className="text-gray-300 hover:text-white transition-colors">
                    {sellerCtaLabel}
                  </Link>
                </li>
              )}
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
            <WhatsAppLink
              href={`https://wa.me/${WHATSAPP_DEFAULT}?text=Olá! Tenho uma dúvida sobre o app TEKA (suporte da plataforma).`}
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] px-4 py-2 rounded-lg transition-colors font-inter text-sm font-medium text-[#0f172a]"
            >
              Equipe Teka - Suporte
            </WhatsAppLink>
            <p className="mt-2 text-xs text-gray-400">
              Canal exclusivo para suporte do app/site. Para negociar livros, use o WhatsApp do sebo.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <p className="font-inter text-sm text-gray-400 text-center">
            © {currentYear} TEKA. Todos os direitos reservados. | Versão 0.7.0+241
          </p>
        </div>
      </div>
    </footer>
  );
}
