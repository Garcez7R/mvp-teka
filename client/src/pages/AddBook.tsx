import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { ArrowLeft, Upload, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { put } from "@vercel/blob";

export default function AddBook() {
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
    price: "",
    condition: "Bom estado" as const,
    pages: "",
    year: "",
  });

  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [searchingCover, setSearchingCover] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: mySebo } = trpc.sebos.getMySebo.useQuery();
  const createBook = trpc.books.create.useMutation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="font-outfit font-bold text-2xl text-[#262969] mb-4">
            Acesso Restrito
          </h1>
          <p className="text-gray-600 mb-6">
            Você precisa fazer login para cadastrar livros.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-block bg-[#da4653] hover:bg-[#c23a45] text-white font-outfit font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  if (!mySebo) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white py-6">
          <div className="container">
            <Link href="/">
              <button className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity mb-4">
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </button>
            </Link>
          </div>
        </div>
        <div className="container py-12">
          <div className="max-w-2xl bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-900 mb-4">
              Sebo não encontrado
            </h2>
            <p className="text-red-800 mb-6">
              Você precisa criar um sebo antes de cadastrar livros.
            </p>
            <Link href="/sebo/novo">
              <button className="bg-[#da4653] hover:bg-[#c23a45] text-white font-outfit font-bold py-2 px-6 rounded-lg transition-colors">
                Criar Sebo
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const searchOpenLibraryCover = async () => {
    if (!formData.isbn) {
      setCoverError("Digite um ISBN para buscar a capa");
      return;
    }

    setSearchingCover(true);
    setCoverError("");

    try {
      const response = await fetch(
        `https://covers.openlibrary.org/b/isbn/${formData.isbn}-M.jpg`
      );

      if (response.ok) {
        setCoverUrl(response.url);
        setCoverFile(null);
      } else {
        setCoverError("Capa não encontrada para este ISBN");
      }
    } catch (error) {
      setCoverError("Erro ao buscar capa. Tente fazer upload manual.");
    } finally {
      setSearchingCover(false);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverUrl(URL.createObjectURL(file));
      setCoverError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.price) {
      toast.error("Título e preço são obrigatórios");
      return;
    }

    if (!mySebo) {
      toast.error("Você precisa criar um sebo primeiro");
      return;
    }

    try {
      setIsUploading(true);
      let finalCoverUrl = coverUrl;

      // Upload image to Vercel Blob if file selected
      if (coverFile) {
        try {
          // Try Vercel Blob if token is available
          if (import.meta.env.PROD) {
            const blob = await put(coverFile.name, coverFile, {
              access: "public",
              multipart: true,
            });
            finalCoverUrl = blob.url;
          } else {
            // Development mode: use local file URL or skip
            console.warn("Vercel Blob not available in development. Using local image URL.");
            finalCoverUrl = URL.createObjectURL(coverFile);
          }
        } catch (error: any) {
          toast.error("Erro ao fazer upload da capa: " + error.message);
          setIsUploading(false);
          return;
        }
      }

      await createBook.mutateAsync({
        seboId: mySebo.id,
        title: formData.title,
        author: formData.author || "Desconhecido",
        isbn: formData.isbn || undefined,
        category: formData.category || "Outros",
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        condition: formData.condition,
        pages: formData.pages ? parseInt(formData.pages) : undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        coverUrl: finalCoverUrl || undefined,
      });

      // Reset form
      setFormData({
        title: "",
        author: "",
        isbn: "",
        category: "",
        description: "",
        price: "",
        condition: "Bom estado",
        pages: "",
        year: "",
      });
      setCoverUrl("");
      setCoverFile(null);

      toast.success("Livro cadastrado com sucesso! 📚");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar livro");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#262969] to-[#1a1a4d] text-white py-6">
        <div className="container">
          <Link href="/">
            <button className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity mb-4">
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
          </Link>
          <h1 className="font-outfit font-bold text-3xl">Cadastrar Livro</h1>
          <p className="text-gray-200 mt-2">Adicione um novo livro ao seu catálogo</p>
        </div>
      </div>

      {/* Form */}
      <div className="container py-12">
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Informações Básicas */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">
                Informações Básicas
              </h2>
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                placeholder="Digite o título do livro"
              />
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Autor
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) =>
                  setFormData({ ...formData, author: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                placeholder="Nome do autor"
              />
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                ISBN
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) =>
                    setFormData({ ...formData, isbn: e.target.value })
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                  placeholder="Ex: 8535914915"
                />
                <button
                  type="button"
                  onClick={searchOpenLibraryCover}
                  disabled={searchingCover || !formData.isbn}
                  className="px-4 py-2 bg-[#da4653] hover:bg-[#c23a45] disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 font-inter font-medium"
                >
                  <Search className="w-4 h-4" />
                  {searchingCover ? "Buscando..." : "Buscar Capa"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
              >
                <option value="">Selecione uma categoria</option>
                <option value="Ficção">Ficção</option>
                <option value="Não-ficção">Não-ficção</option>
                <option value="Romance">Romance</option>
                <option value="Mistério">Mistério</option>
                <option value="Técnico">Técnico</option>
                <option value="Infantil">Infantil</option>
                <option value="Poesia">Poesia</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Preço e Condição */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">
                Preço e Condição
              </h2>
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Preço (R$) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Condição
              </label>
              <select
                value={formData.condition}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    condition: e.target.value as any,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
              >
                <option value="Excelente">Excelente</option>
                <option value="Bom estado">Bom estado</option>
                <option value="Usado">Usado</option>
                <option value="Desgastado">Desgastado</option>
              </select>
            </div>

            {/* Detalhes */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">
                Detalhes Adicionais
              </h2>
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Número de Páginas
              </label>
              <input
                type="number"
                value={formData.pages}
                onChange={(e) =>
                  setFormData({ ...formData, pages: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                placeholder="Ex: 300"
              />
            </div>

            <div>
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Ano de Publicação
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                placeholder="Ex: 2020"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-inter font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] focus:border-transparent outline-none font-inter"
                placeholder="Descreva o livro..."
                rows={4}
              />
            </div>

            {/* Capa */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">
                Capa do Livro
              </h2>

              {coverError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-inter">
                  {coverError}
                </div>
              )}

              {coverUrl && (
                <div className="mb-4">
                  <p className="text-sm font-inter font-medium text-gray-700 mb-2">
                    Prévia da Capa:
                  </p>
                  <img
                    src={coverUrl}
                    alt="Prévia da capa"
                    className="h-48 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}

              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#da4653] transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-inter font-medium text-gray-700">
                    Clique para fazer upload da capa
                  </p>
                  <p className="text-sm text-gray-500 font-inter">
                    ou arraste uma imagem aqui
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Link href="/">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-inter font-medium"
              >
                Cancelar
              </button>
            </Link>
            <button
              type="submit"
              disabled={createBook.isPending || isUploading}
              className="px-6 py-2 bg-[#da4653] hover:bg-[#c23a45] disabled:bg-gray-400 text-white rounded-lg transition-colors font-inter font-medium flex items-center gap-2"
            >
              {createBook.isPending || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isUploading ? "Enviando capa..." : "Cadastrando..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Cadastrar Livro
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
