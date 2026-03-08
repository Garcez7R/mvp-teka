import { Link, useParams } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import BookCard from "@/components/BookCard";

function seboLinkFromData(sebo: any): string {
  if (sebo?.plan === "pro" && sebo?.proSlug) {
    return `/s/${sebo.proSlug}`;
  }
  return `/sebo/${sebo?.id ?? ""}`;
}

export default function SeboStorefront() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const parsedSeboId = Number.parseInt(id || "", 10);

  const byIdQuery = trpc.sebos.getById.useQuery(parsedSeboId, {
    enabled: !slug && Number.isFinite(parsedSeboId) && parsedSeboId > 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const bySlugQuery = trpc.sebos.getBySlug.useQuery(slug || "", {
    enabled: Boolean(slug),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const query = slug ? bySlugQuery : byIdQuery;
  const sebo = query.data as any;
  const books = Array.isArray(sebo?.books) ? sebo.books : [];
  const visibleBooks = books.filter((book: any) => book?.isVisible !== false);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header />
      <main className="container flex-1 py-8">
        <div className="mb-6">
          <Link href="/sebos" className="text-sm text-[#da4653] hover:underline">
            ← Voltar para Sebos
          </Link>
        </div>

        {query.isLoading ? (
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <p className="text-gray-700 dark:text-gray-200">Carregando vitrine do sebo...</p>
          </div>
        ) : query.error || !sebo ? (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="text-red-800 font-semibold">Não foi possível carregar esta vitrine.</p>
            <p className="text-red-700 text-sm mt-1">
              Verifique o link ou tente novamente.
            </p>
          </div>
        ) : (
          <>
            <section className="p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-6">
              <div className="flex items-center gap-4">
                {sebo.logoUrl ? (
                  <img
                    src={sebo.logoUrl}
                    alt={`Logo de ${sebo.name}`}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <img
                    src="/teka-logo.png"
                    alt="Logo padrão TEKA"
                    className="w-14 h-14 rounded-lg object-contain border border-gray-200 dark:border-gray-700 p-1 bg-white"
                  />
                )}
                <div className="min-w-0">
                  <h1 className="font-outfit font-bold text-2xl text-[#262969] dark:text-gray-100 truncate">
                    {sebo.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {sebo.city || "-"} / {sebo.state || "-"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {sebo.verified ? (
                      <span className="text-[11px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold">
                        Verificado
                      </span>
                    ) : null}
                    {sebo.plan === "pro" ? (
                      <span className="text-[11px] px-2 py-1 rounded bg-[#da4653] text-[#262969] font-semibold">
                        Sebo Pro
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-700 font-semibold">
                        Sebo Free
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {sebo.description ? (
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-4">{sebo.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  sebo.supportsPickup ? "Retirada no local" : null,
                  sebo.shipsNeighborhood ? "Entrega no bairro" : null,
                  sebo.shipsCity ? "Entrega na cidade" : null,
                  sebo.shipsState ? "Entrega no estado" : null,
                  sebo.shipsNationwide ? "Envio nacional" : null,
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <span
                      key={item as string}
                      className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      {item as string}
                    </span>
                  ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">
                Link desta vitrine:{" "}
                <a href={seboLinkFromData(sebo)} className="text-[#da4653] hover:underline">
                  {seboLinkFromData(sebo)}
                </a>
              </p>
            </section>

            <section>
              <h2 className="font-outfit font-semibold text-xl text-[#262969] dark:text-gray-100 mb-3">
                Livros deste sebo ({visibleBooks.length})
              </h2>
              {visibleBooks.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">Nenhum livro visível no momento.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {visibleBooks.map((book: any) => (
                    <BookCard
                      key={book.id}
                      id={book.id}
                      title={book.title}
                      author={book.author || undefined}
                      category={book.category || "Outros"}
                      price={book.price}
                      sebo={{ name: sebo.name, verified: Boolean(sebo.verified) }}
                      condition={book.condition || "Bom estado"}
                      isbn={book.isbn || undefined}
                      coverUrl={book.coverUrl || undefined}
                      quantity={Number(book.quantity ?? 1)}
                      availabilityStatus={book.availabilityStatus || "ativo"}
                      compact
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
