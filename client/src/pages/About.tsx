import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="container flex-1 py-12">
        {/* Hero */}
        <section className="mb-16">
          <h1 className="font-outfit font-bold text-4xl text-[#262969] mb-6">
            Sobre a TEKA
          </h1>
          <p className="font-inter text-lg text-gray-700 max-w-3xl leading-relaxed">
            A TEKA conecta leitores e sebos para facilitar a descoberta de livros usados com preço justo, transparência e contato direto entre as partes.
          </p>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-16">
          <h2 className="font-outfit font-bold text-xl text-[#262969] mb-2">Aviso Legal</h2>
          <p className="font-inter text-sm text-gray-700">
            A TEKA apenas conecta leitores e sebos; não intermediamos pagamento, entrega ou garantias da transação.
          </p>
          <p className="font-inter text-sm text-gray-700 mt-2">
            Por privacidade e segurança, o endereço completo do sebo é informado diretamente no atendimento com o vendedor.
          </p>
          <p className="font-inter text-xs text-gray-600 mt-3">
            Referência legal informativa: LGPD (Lei nº 13.709/2018, arts. 7º, 18 e 46) e
            Marco Civil da Internet (Lei nº 12.965/2014, art. 15).
          </p>
        </section>

        <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-16">
          <h2 className="font-outfit font-bold text-xl text-[#262969] mb-3">
            Governança, Privacidade e Segurança
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 font-inter">
            <li>Privacidade por padrão: dados pessoais não são exibidos publicamente.</li>
            <li>Controle de acesso por perfil e registro de ações administrativas sensíveis.</li>
            <li>Minimização de dados: coleta limitada ao necessário para operação, suporte e segurança.</li>
            <li>Direitos do titular: canal para solicitar acesso, correção e exclusão de dados.</li>
            <li>Segurança técnica: uso de HTTPS, proteção contra abuso e monitoramento de falhas.</li>
          </ul>
          <p className="font-inter text-xs text-gray-600 mt-3">
            Base legal informativa: LGPD (Lei nº 13.709/2018, arts. 7º, 18 e 46) e Marco Civil da Internet (Lei nº 12.965/2014, art. 15).
          </p>
        </section>

        <section className="mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-8">
            Como Funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "1. Encontre",
                description: "Pesquise por título, autor, categoria e compare ofertas entre sebos."
              },
              {
                title: "2. Compare",
                description: "Veja condição do exemplar, preço, sebo e cidade/UF antes de decidir."
              },
              {
                title: "3. Negocie",
                description: "Fale direto com o sebo pelo WhatsApp para confirmar disponibilidade e retirada/entrega."
              }
            ].map((step, idx) => (
              <div key={idx} className="p-5 border border-gray-200 rounded-lg bg-white">
                <h3 className="font-outfit font-semibold text-lg text-[#262969] mb-2">{step.title}</h3>
                <p className="font-inter text-sm text-gray-700">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Product Status */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-4">
            Status do Produto
          </h2>
          <p className="font-inter text-gray-700 mb-4">
            Plataforma pronta para operação em piloto controlado, com funcionalidades essenciais para compradores e livreiros.
            Evoluímos continuamente com base em uso real e feedback de usuários.
          </p>
          <p className="font-inter text-sm text-gray-600">
            <strong>Versão:</strong> 0.7.0+241 | <strong>Ciclo:</strong> Release contínua | <strong>Ambiente:</strong> Cloudflare Pages
          </p>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-8">
            Funcionalidades Principais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Busca Inteligente",
                description: "Encontre livros por título, autor, ISBN, categoria, sebo e localização."
              },
              {
                title: "Detalhes Completos",
                description: "Consulte preço, condição, disponibilidade, sebo e logística de retirada/entrega."
              },
              {
                title: "Contato Direto",
                description: "Fale com o sebo via WhatsApp para negociar disponibilidade, retirada e envio."
              },
              {
                title: "Interface Responsiva",
                description: "Experiência otimizada para celular, tablet e desktop com navegação consistente."
              },
              {
                title: "Sebos Parceiros",
                description: "Descubra sebos com catálogo ativo e compare diferentes ofertas do mesmo título."
              },
              {
                title: "Gestão para Livreiro",
                description: "Cadastre por ISBN/câmera, faça scan em lote e gerencie estoque, status e visibilidade."
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-[#da4653] flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-outfit font-semibold text-lg text-[#262969] mb-2">
                    {feature.title}
                  </h3>
                  <p className="font-inter text-gray-700">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-8">
            Instalação do App (PWA)
          </h2>
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <p className="font-inter text-gray-700 mb-3">
              A TEKA funciona como PWA (Progressive Web App): você pode instalar no celular ou computador e abrir como aplicativo, sem loja.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 font-inter">
              <li>Android/Chrome: menu do navegador &gt; <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
              <li>iPhone/Safari: botão compartilhar &gt; <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Desktop/Chrome: ícone de instalação na barra de endereço.</li>
            </ul>
            <p className="font-inter text-xs text-gray-600 mt-3">
              Após instalar, o acesso à câmera para escanear ISBN e capas pode ser mais estável em alguns dispositivos.
            </p>
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-8">
            Próximos Passos
          </h2>
          <div className="space-y-4">
            {[
              "Integração com mais sebos parceiros",
              "Sinalização de confiança e reputação dos sebos",
              "Notificações para favoritos e lista de procura",
              "Métricas operacionais para livreiros",
              "Melhorias contínuas de logística e experiência mobile"
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-2 h-2 bg-[#da4653] rounded-full"></div>
                <p className="font-inter text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white rounded-lg p-12 text-center">
          <h2 className="font-outfit font-bold text-2xl mb-4">
            Pronto para explorar?
          </h2>
          <p className="font-inter text-gray-200 mb-8 max-w-2xl mx-auto">
            Comece agora a buscar livros no catálogo ou cadastre seu sebo para vender com mais alcance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <button className="bg-[#da4653] hover:bg-[#c23a45] text-white font-outfit font-bold py-3 px-8 rounded-lg transition-colors">
              Ir para o Início
              </button>
            </Link>
            <Link href="/sebo/novo">
              <button className="border border-white bg-[#ffffff] text-[#262969] hover:bg-[#f3f4f6] font-outfit font-bold py-3 px-8 rounded-lg transition-colors">
                Quero vender livros
              </button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
