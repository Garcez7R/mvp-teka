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
            TEKA é um marketplace inovador que conecta leitores a sebos parceiros, facilitando a compra e venda de livros usados com qualidade e segurança.
          </p>
        </section>

        {/* MVP Status */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-16">
          <h2 className="font-outfit font-bold text-2xl text-[#262969] mb-4">
            🚀 MVP em Validação
          </h2>
          <p className="font-inter text-gray-700 mb-4">
            Estamos testando a plataforma com funcionalidades essenciais. Seu feedback é fundamental para evoluirmos.
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
                description: "Comunique-se diretamente com sebos via WhatsApp para negociar."
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
              "Sistema de avaliações e comentários",
              "Histórico de compras e favoritos",
              "Notificações de novos livros",
              "Opções de entrega e pagamento"
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
            Comece a buscar seus livros favoritos agora mesmo. Encontre ofertas incríveis em sebos parceiros.
          </p>
          <Link href="/">
            <button className="bg-[#da4653] hover:bg-[#c23a45] text-white font-outfit font-bold py-3 px-8 rounded-lg transition-colors">
              Ir para o Catálogo
            </button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
