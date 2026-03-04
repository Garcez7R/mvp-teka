import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Upload, Search, Loader2, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { put } from "@vercel/blob";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function AddBook() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
    seboId: "",
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

  const [creatingSebo, setCreatingSebo] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [searchingBook, setSearchingBook] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [isbnValid, setIsbnValid] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const createBookMutation = trpc.books.create.useMutation();
  const { data: sebosList = [] } = trpc.sebos.list.useQuery();
  const { data: mySebo, isLoading: seboLoading } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Você precisa estar logado para cadastrar um livro");
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (mySebo && !formData.seboId) {
      setFormData(prev => ({ ...prev, seboId: mySebo.id.toString() }));
    }
  }, [mySebo]);

  // Validar ISBN
  const validateISBN = (isbn: string): boolean => {
    if (!isbn) return false;
    const clean = isbn.replace(/[-\s]/g, '');
    return (clean.length === 10 || clean.length === 13) && /^\d+$/.test(clean);
  };

  // Atualizar validação do ISBN
  useEffect(() => {
    if (!formData.isbn) {
      setIsbnValid(null);
    } else {
      setIsbnValid(validateISBN(formData.isbn));
    }
  }, [formData.isbn]);

  const searchBookByISBN = async () => {
    if (!formData.isbn) {
      setCoverError("Digite um ISBN para buscar o livro");
      return;
    }

    if (!validateISBN(formData.isbn)) {
      setCoverError("ISBN inválido. Use apenas números e hífens (10 ou 13 dígitos).");
      return;
    }

    setSearchingBook(true);
    setCoverError("");

    try {
      const isbnClean = formData.isbn.replace(/-/g, "");
      
      // 1. Buscar metadados via Open Library API
      const metaResp = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbnClean}&format=json&jscmd=data`);
      
      if (metaResp.ok) {
        const data = await metaResp.json();
        const bookKey = `ISBN:${isbnClean}`;
        
        if (data[bookKey]) {
          const bookInfo = data[bookKey];
          
          // Preencher campos automaticamente
          setFormData(prev => ({
            ...prev,
            title: bookInfo.title || prev.title,
            author: bookInfo.authors?.[0]?.name || prev.author,
            pages: bookInfo.number_of_pages?.toString() || prev.pages,
            year: bookInfo.publish_date?.match(/\d{4}/)?.[0] || prev.year,
            description: bookInfo.notes || prev.description,
          }));

          // Tentar pegar a capa
          if (bookInfo.cover?.large || bookInfo.cover?.medium) {
            setCoverUrl(bookInfo.cover.large || bookInfo.cover.medium);
            setCoverFile(null);
          } else {
            // Fallback para a URL direta de capas se não estiver no JSON
            const directCoverUrl = `https://covers.openlibrary.org/b/isbn/${isbnClean}-L.jpg`;
            const checkCover = await fetch(directCoverUrl, { method: 'HEAD' });
            if (checkCover.ok && !checkCover.url.includes("blank")) {
              setCoverUrl(directCoverUrl);
            }
          }
          
          toast.success("Dados do livro encontrados!");
        } else {
          setCoverError("Livro não encontrado na base de dados. Preencha manualmente.");
        }
      } else {
        setCoverError("Erro ao conectar com o serviço de busca. Verifique sua internet.");
      }
    } catch (error) {
      setCoverError("Erro de conexão. Tente novamente em alguns minutos.");
    } finally {
      setSearchingBook(false);
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

    if (!formData.title || !formData.price || (!formData.seboId && !mySebo)) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      setIsUploading(true);

      let finalCoverUrl = coverUrl;
      if (coverFile) {
        try {
          if (import.meta.env.PROD) {
            const blob = await put(coverFile.name, coverFile, {
              access: "public",
              multipart: true,
            });
            finalCoverUrl = blob.url;
          } else {
            finalCoverUrl = URL.createObjectURL(coverFile);
          }
        } catch (error: any) {
          toast.error("Erro ao fazer upload da capa: " + error.message);
          setIsUploading(false);
          return;
        }
      }

      let seboIdToUse: number;
      if (mySebo) {
        seboIdToUse = mySebo.id;
      } else {
        seboIdToUse = parseInt(formData.seboId);
      }

      await createBookMutation.mutateAsync({
        seboId: seboIdToUse,
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

      toast.success("Livro cadastrado com sucesso! 📚");
      setTimeout(() => navigate("/"), 1500);
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar livro");
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || seboLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#da4653]" />
      </div>
    );
  }

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
          <h1 className="font-outfit font-bold text-3xl">Cadastrar Livro</h1>
          <p className="text-gray-200 mt-2">Adicione um novo livro ao seu catálogo</p>
        </div>
      </div>

      <div className="container py-12">
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="grid grid-cols-1 gap-6 mb-8">
            {/* Seção do Sebo */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">Informações do Sebo</h2>
              {mySebo ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-green-800 font-inter text-sm">
                    Você está cadastrando livros para o sebo: <strong>{mySebo.name}</strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-inter text-sm">
                      <strong>Atenção:</strong> Você precisa criar um sebo antes de cadastrar livros.
                    </p>
                    <Link href="/sebo/novo">
                      <button className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-inter font-medium py-2 px-4 rounded-lg">
                        Criar Sebo
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Seção do Livro - ISBN PRIMEIRO */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">Informações do Livro</h2>
              
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                <label className="block text-sm font-bold text-[#262969] mb-2">
                  ISBN (Opcional)
                </label>
                <p className="text-xs text-gray-500 mb-4 font-inter">
                  Digite o ISBN para preencher automaticamente os dados e a capa do livro.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none font-inter transition-colors ${
                        isbnValid === true ? 'border-green-400 focus:ring-green-400' :
                        isbnValid === false ? 'border-red-400 focus:ring-red-400' :
                        'border-gray-300 focus:ring-[#da4653]'
                      }`}
                      placeholder="Ex: 9788535914849"
                    />
                    {isbnValid === true && (
                      <CheckCircle className="absolute right-3 top-3 w-6 h-6 text-green-500" />
                    )}
                    {isbnValid === false && (
                      <XCircle className="absolute right-3 top-3 w-6 h-6 text-red-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={searchBookByISBN}
                    disabled={searchingBook || !formData.isbn || isbnValid === false}
                    className="w-full py-3 bg-[#262969] text-white rounded-lg hover:bg-[#1a1a4d] disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2 font-bold"
                  >
                    {searchingBook ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    {searchingBook ? 'Buscando capa...' : 'Buscar Capa'}
                  </button>
                </div>
                {coverError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">{coverError}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="Título do livro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="Nome do autor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
              >
                <option value="">Selecione uma categoria</option>
                <option value="Literatura Brasileira">Literatura Brasileira</option>
                <option value="Ficção Científica">Ficção Científica</option>
                <option value="Fantasia">Fantasia</option>
                <option value="Romance">Romance</option>
                <option value="História">História</option>
                <option value="Infantil">Infantil</option>
                <option value="Técnico">Técnico</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condição</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
              >
                <option value="Excelente">Excelente</option>
                <option value="Bom estado">Bom estado</option>
                <option value="Usado">Usado</option>
                <option value="Desgastado">Desgastado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Páginas</label>
              <input
                type="number"
                value={formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="Ex: 300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="Ex: 2020"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                rows={3}
                placeholder="Breve descrição do estado do livro..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Capa do Livro</label>
              <div className="grid grid-cols-1 gap-6">
                {/* Preview da capa encontrada */}
                {coverUrl && (
                  <div>
                    <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
                      <p className="text-green-700 font-medium mb-2 text-sm">Capa encontrada:</p>
                      <div className="w-32 h-48 bg-white rounded-lg border border-gray-200 overflow-hidden mx-auto">
                        <img src={coverUrl} alt="Preview da capa" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-xs text-green-600 mt-2">Esta capa será usada no cadastro</p>
                    </div>
                  </div>
                )}
                
                {/* Upload manual */}
                <div>
                  <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#da4653] transition-all bg-gray-50 hover:bg-white">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm font-medium text-gray-700 block">Fazer upload manual</span>
                    <span className="text-xs text-gray-500">PNG, JPG até 5MB</span>
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>
                  {coverFile && (
                    <p className="mt-2 text-sm text-gray-600">Arquivo selecionado: {coverFile.name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={createBookMutation.isPending || isUploading || !mySebo}
              className="flex-1 bg-[#da4653] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#c23a45] disabled:bg-gray-400 shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2"
            >
              {createBookMutation.isPending || isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                "Finalizar Cadastro"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
