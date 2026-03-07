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
            Sobre o TEKA
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

        {/* MVP Status */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-4">
            MVP em Validação
          </h2>
          <p className="font-inter text-gray-700 mb-4">
            Estamos validando o produto com funcionalidades essenciais para compradores e livreiros. Seu feedback é fundamental para evoluirmos com foco em uso real.
          </p>
          <p className="font-inter text-sm text-gray-600">
            <strong>Versão:</strong> 1.0.0 | <strong>Status:</strong> Beta
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
                description: "Encontre livros por título, categoria ou sebo com filtros avançados."
              },
              {
                title: "Detalhes Completos",
                description: "Acesse informações detalhadas de cada livro: ISBN, páginas, condição e mais."
              },
              {
                title: "Contato Direto",
                description: "Fale com o sebo via WhatsApp para negociar disponibilidade, retirada e envio."
              },
              {
                title: "Interface Responsiva",
                description: "Acesse a plataforma em qualquer dispositivo: mobile, tablet ou desktop."
              },
              {
                title: "Sebos Parceiros",
                description: "Conheça os sebos que participam da plataforma e suas ofertas."
              },
              {
                title: "Preços Justos",
                description: "Compare preços entre sebos e encontre as melhores ofertas."
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
              "Notificações de novos livros",
              "Melhorias de logística de entrega e retirada"
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
              <button className="bg-white text-[#262969] hover:bg-gray-100 font-outfit font-bold py-3 px-8 rounded-lg transition-colors">
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
