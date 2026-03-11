import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, CheckCircle } from "lucide-react";
import { formatCpfCnpjInput } from "@/lib/formatters";

export default function CreateSebo() {
  const [, navigate] = useLocation();
  const { isAuthenticated, role, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ownerName: "",
    documentId: "",
    addressLine: "",
    postalCode: "",
    openingYear: "",
    logoUrl: "",
    supportsPickup: true,
    shipsNeighborhood: false,
    shipsCity: false,
    shipsState: false,
    shipsNationwide: false,
    shippingAreas: "",
    shippingFeeNotes: "",
    shippingEta: "",
    shippingNotes: "",
    whatsapp: "",
    city: "",
    state: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [legalAware, setLegalAware] = useState(false);

  const createSeboMutation = trpc.sebos.create.useMutation({
    onError: (error) => {
      console.error("Erro ao criar sebo:", error);
      trackEvent("sebo_create_error", { message: error.message });
      setError(error.message || "Erro ao criar sebo");
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    const value =
      name === "documentId" ? formatCpfCnpjInput(e.target.value) : e.target.value;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Nome do sebo é obrigatório");
      }
      if (!formData.ownerName.trim()) {
        throw new Error("Nome completo do sebista é obrigatório");
      }
      if (!formData.documentId.trim()) {
        throw new Error("CPF/CNPJ é obrigatório");
      }
      if (!formData.whatsapp.trim()) {
        throw new Error("WhatsApp é obrigatório para contato");
      }
      if (!legalAware) {
        throw new Error("Confirme que está ciente da política legal e de privacidade.");
      }

      await createSeboMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        ownerName: formData.ownerName.trim(),
        documentId: formData.documentId.trim(),
        addressLine: formData.addressLine || undefined,
        postalCode: formData.postalCode || undefined,
        openingYear: formData.openingYear ? Number(formData.openingYear) : undefined,
        logoUrl: formData.logoUrl || undefined,
        supportsPickup: formData.supportsPickup,
        shipsNeighborhood: formData.shipsNeighborhood,
        shipsCity: formData.shipsCity,
        shipsState: formData.shipsState,
        shipsNationwide: formData.shipsNationwide,
        shippingAreas: formData.shippingAreas || undefined,
        shippingFeeNotes: formData.shippingFeeNotes || undefined,
        shippingEta: formData.shippingEta || undefined,
        shippingNotes: formData.shippingNotes || undefined,
        whatsapp: formData.whatsapp,
        city: formData.city || undefined,
        state: formData.state || undefined,
      });

      trackEvent("sebo_create_success", { city: formData.city || "na" });
      navigate("/add-book?sebo_created=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar sebo";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const canCreateSebo = role === "livreiro" || role === "admin";
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  if (!isAuthenticated || !canCreateSebo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <p className="text-gray-700">Apenas livreiros e admins podem criar sebos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header />

      <main className="container flex-1 py-12">
        <div className="max-w-2xl">
          <div className="mb-8">
            <h1 className="font-outfit font-bold text-4xl mb-2 text-[#262969]">
              Criar Seu Sebo
            </h1>
            <p className="font-inter text-gray-600">
              Comece a vender livros usados na TEKA
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-inter font-semibold text-red-900">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-gray-50 p-8 rounded-lg border border-gray-200">
            {/* Nome do Sebo */}
            <div className="mb-6">
              <label className="block font-inter font-semibold text-gray-700 mb-2">
                Nome do Sebo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Livraria Clássicos"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                required
              />
              <p className="font-inter text-xs text-gray-500 mt-1">
                Este é o nome que aparecerá para os compradores
              </p>
            </div>

            {/* Descrição */}
            <div className="mb-6">
              <label className="block font-inter font-semibold text-gray-700 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Fale um pouco sobre seu sebo, especialidades, etc."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  Nome completo do sebista *
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="Ex: Nome Sobrenome"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                  required
                />
              </div>
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  CPF/CNPJ *
                </label>
                <input
                  type="text"
                  name="documentId"
                  value={formData.documentId}
                  onChange={handleChange}
                  placeholder="Ex: 123.456.789-00 ou 12.345.678/0001-99"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                  required
                />
              </div>
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  Endereço (opcional)
                </label>
                <input
                  type="text"
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleChange}
                  placeholder="Rua, número e bairro"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  CEP (opcional)
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="Ex: 90000-000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  Ano de abertura (opcional)
                </label>
                <input
                  type="number"
                  name="openingYear"
                  value={formData.openingYear}
                  onChange={handleChange}
                  placeholder="Ex: 2018"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  URL do logo (opcional)
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
            </div>

            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-white">
              <p className="font-inter font-semibold text-gray-700 mb-3">Logística de Entrega</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="supportsPickup" checked={formData.supportsPickup} onChange={handleCheckboxChange} />
                  Retirada no local
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="shipsNeighborhood" checked={formData.shipsNeighborhood} onChange={handleCheckboxChange} />
                  Entrega no bairro
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="shipsCity" checked={formData.shipsCity} onChange={handleCheckboxChange} />
                  Entrega na cidade
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="shipsState" checked={formData.shipsState} onChange={handleCheckboxChange} />
                  Entrega no estado
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="shipsNationwide" checked={formData.shipsNationwide} onChange={handleCheckboxChange} />
                  Envio nacional
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  name="shippingAreas"
                  value={formData.shippingAreas}
                  onChange={handleChange}
                  placeholder="Bairros/regiões atendidas"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
                <input
                  type="text"
                  name="shippingEta"
                  value={formData.shippingEta}
                  onChange={handleChange}
                  placeholder="Prazo médio (ex: 1-2 dias)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
                <input
                  type="text"
                  name="shippingFeeNotes"
                  value={formData.shippingFeeNotes}
                  onChange={handleChange}
                  placeholder="Frete/custos (ex: grátis acima de R$ 100)"
                  className="w-full md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
              <textarea
                name="shippingNotes"
                value={formData.shippingNotes}
                onChange={handleChange}
                rows={2}
                placeholder="Observações logísticas"
                className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
              />
            </div>

            {/* WhatsApp */}
            <div className="mb-6">
              <label className="block font-inter font-semibold text-gray-700 mb-2">
                WhatsApp para Contato *
              </label>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="Ex: 11987654321 ou +5511987654321"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                required
              />
              <p className="font-inter text-xs text-gray-500 mt-1">
                Formato: (11) 98765-4321 ou 11987654321
              </p>
            </div>

            {/* Localização */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  Cidade (opcional)
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ex: São Paulo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
              <div>
                <label className="block font-inter font-semibold text-gray-700 mb-2">
                  Estado (opcional)
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Ex: SP"
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-inter focus:outline-none focus:ring-2 focus:ring-[#da4653]"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3 dark:bg-slate-900/60 dark:border-slate-700">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-inter text-sm text-blue-900 dark:text-blue-100">
                  <span className="font-semibold">Próximo:</span> Após criar seu sebo, você poderá adicionar livros para venda imediatamente.
                </p>
              </div>
            </div>

            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800/60">
              <label className="inline-flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                <input
                  type="checkbox"
                  checked={legalAware}
                  onChange={(e) => setLegalAware(e.target.checked)}
                  className="mt-0.5 accent-[#da4653]"
                />
                <span>
                  Estou ciente das regras de privacidade e responsabilidade da plataforma:
                  a TEKA conecta partes e não intermedia pagamento/entrega.
                  O tratamento de dados pessoais segue LGPD (Lei nº 13.709/2018, arts. 7º, 18 e 46)
                  e Marco Civil da Internet (Lei nº 12.965/2014, art. 15).
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !legalAware}
              className="w-full px-6 py-3 bg-[#da4653] text-white font-inter font-semibold rounded-lg hover:bg-[#c93d45] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Criando sebo..." : "Criar Sebo e Cadastrar Primeiro Livro"}
            </button>
          </form>

          <p className="font-inter text-sm text-gray-600 text-center mt-6">
            Já tem um sebo?{" "}
            <button
              onClick={() => navigate("/")}
              className="text-[#da4653] font-semibold hover:underline"
            >
              Voltar para home
            </button>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
