import { Link } from "wouter";
import { WHATSAPP_DEFAULT } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import WhatsAppLink from "@/components/WhatsAppLink";
import { toast } from "sonner";
import { useRef, useState } from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [tekaClicks, setTekaClicks] = useState(0);
  const tekaTimerRef = useRef<number | null>(null);
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
    : "/seller-required";
  const sellerCtaLabel = canManageCatalog
    ? mySebo?.id
      ? "Cadastrar Livro"
      : "Criar Sebo"
    : "Quero vender livros";

  const launchConfetti = () => {
    if (typeof document === "undefined") return;
    const container = document.createElement("div");
    container.className = "teka-confetti";
    const colors = ["#da4653", "#262969", "#f8fafc", "#e5e7eb", "#f59e0b"];
    for (let i = 0; i < 30; i += 1) {
      const piece = document.createElement("span");
      piece.className = "teka-confetti-piece";
      const drift = (Math.random() * 2 - 1) * 60;
      const rotate = Math.random() * 360;
      const delay = Math.random() * 150;
      const duration = 900 + Math.random() * 600;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.setProperty("--x", `${drift}px`);
      piece.style.setProperty("--r", `${rotate}deg`);
      piece.style.animationDelay = `${delay}ms`;
      piece.style.animationDuration = `${duration}ms`;
      container.appendChild(piece);
    }
    document.body.appendChild(container);
    window.setTimeout(() => container.remove(), 1800);
  };

  const handleTekaEasterEgg = () => {
    if (tekaTimerRef.current) {
      window.clearTimeout(tekaTimerRef.current);
    }
    setTekaClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        toast.success("Você encontrou o Sebo Secreto.");
        launchConfetti();
        return 0;
      }
      return next;
    });
    tekaTimerRef.current = window.setTimeout(() => {
      setTekaClicks(0);
    }, 1200);
  };

  return (
    <footer className="bg-[#262969] text-white mt-16">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="font-outfit font-bold text-lg mb-2">
              <button
                type="button"
                onClick={handleTekaEasterEgg}
                className="text-[#da4653] hover:opacity-80 transition-opacity"
                title="Clique 5x"
              >
                TEKA
              </button>
            </h3>
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
