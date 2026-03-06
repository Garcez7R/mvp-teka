import { useMemo, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

export default function SebosPage() {
  const { data: sebos = [], isLoading } = trpc.sebos.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [postalCodeFilter, setPostalCodeFilter] = useState("");

  const filteredSebos = useMemo(() => {
    const cityNeedle = cityFilter.trim().toLowerCase();
    const stateNeedle = stateFilter.trim().toLowerCase();
    const cepNeedle = postalCodeFilter.trim().toLowerCase();

    return sebos.filter((sebo: any) => {
      const city = String(sebo.city || "").toLowerCase();
      const state = String(sebo.state || "").toLowerCase();
      const postalCode = String((sebo as any).postalCode || "").toLowerCase();
      const matchesCity = !cityNeedle || city.includes(cityNeedle);
      const matchesState = !stateNeedle || state === stateNeedle;
      const matchesCep = !cepNeedle || postalCode.includes(cepNeedle);
      return matchesCity && matchesState && matchesCep;
    });
  }, [cityFilter, postalCodeFilter, sebos, stateFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-12">
        <div className="mb-6">
          <h1 className="font-outfit font-bold text-3xl text-[#262969]">Sebos Cadastrados</h1>
          <p className="text-gray-600 mt-2">
            Encontre sebos por cidade, estado (UF) ou CEP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filtrar por cidade"
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
            placeholder="Filtrar por UF"
            maxLength={2}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            value={postalCodeFilter}
            onChange={(e) => setPostalCodeFilter(e.target.value)}
            placeholder="Filtrar por CEP"
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {isLoading ? (
          <p className="text-gray-600">Carregando sebos...</p>
        ) : filteredSebos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSebos.map((sebo: any) => (
              <div key={sebo.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <h2 className="font-outfit font-semibold text-xl text-[#262969]">{sebo.name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {sebo.city || "-"} / {sebo.state || "-"}
                  {(sebo as any).postalCode ? ` • CEP ${(sebo as any).postalCode}` : ""}
                </p>
                {sebo.description ? (
                  <p className="text-sm text-gray-700 mt-2">{sebo.description}</p>
                ) : null}
                <p className="text-xs text-gray-600 mt-2">
                  Entrega:{" "}
                  {[
                    (sebo as any).supportsPickup ? "Retirada" : null,
                    (sebo as any).shipsNeighborhood ? "Bairro" : null,
                    (sebo as any).shipsCity ? "Cidade" : null,
                    (sebo as any).shipsState ? "Estado" : null,
                    (sebo as any).shipsNationwide ? "Nacional" : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Não informado"}
                </p>
                <div className="mt-3">
                  <Link href="/" className="text-[#da4653] hover:underline text-sm">
                    Ver livros na página inicial
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">Nenhum sebo encontrado para os filtros informados.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
