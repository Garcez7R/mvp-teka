import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function CreateSebo() {
  const [, navigate] = useLocation();
  const { isAuthenticated, role, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    whatsapp: "",
    city: "",
    state: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createSeboMutation = trpc.sebos.create.useMutation({
    onError: (error) => {
      console.error("Erro ao criar sebo:", error);
      trackEvent("sebo_create_error", { message: error.message });
      setError(error.message || "Erro ao criar sebo");
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      if (!formData.whatsapp.trim()) {
        throw new Error("WhatsApp é obrigatório para contato");
      }

      await createSeboMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-700">Apenas livreiros e admins podem criar sebos.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
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
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-inter text-sm text-blue-900">
                  <span className="font-semibold">Próximo:</span> Após criar seu sebo, você poderá adicionar livros para venda imediatamente.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
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
