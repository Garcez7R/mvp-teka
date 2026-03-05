import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, Upload, Search, Loader2, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export default function AddBook() {
  const [, navigate] = useLocation();
  const { isAuthenticated, role, loading } = useAuth({ redirectOnUnauthenticated: true });

  const [formData, setFormData] = useState({
    seboId: "",
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
    price: "",
    condition: "Bom estado" as const,
    availabilityStatus: "ativo" as "ativo" | "reservado" | "vendido",
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
  const [showSeboCreatedBanner, setShowSeboCreatedBanner] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerBusy, setScannerBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerActiveRef = useRef(false);
  const scanFrameRef = useRef<number | null>(null);

  const createBookMutation = trpc.books.create.useMutation();
  const { data: sebosList = [], isLoading: sebosLoading } = trpc.sebos.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const {
    data: mySebo,
    isLoading: seboLoading,
    error: mySeboError,
  } = trpc.sebos.getMySebo.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const canSubmit = Boolean(mySebo || formData.seboId);

  const normalizeISBN = (isbn: string): string =>
    isbn.toUpperCase().replace(/[^0-9X]/g, "");
  const curatedCoverByIsbn: Record<string, string> = {
    "9788595084759": "/covers/as-duas-torres.svg",
  };
  const curatedCoverByTitle: Record<string, string> = {
    "dom casmurro": "/covers/dom-casmurro.svg",
    "as duas torres": "/covers/as-duas-torres.svg",
  };

  // Validar ISBN
  const validateISBN = (isbn: string): boolean => {
    if (!isbn) {
      return false;
    }
    const clean = normalizeISBN(isbn);
    if (clean.length === 13) {
      return /^\d{13}$/.test(clean);
    }
    if (clean.length === 10) {
      return /^\d{9}[\dX]$/.test(clean);
    }
    return false;
  };

  // Atualizar validação do ISBN
  useEffect(() => {
    if (!formData.isbn) {
      setIsbnValid(null);
    } else {
      setIsbnValid(validateISBN(formData.isbn));
    }
  }, [formData.isbn]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("sebo_created") === "1") {
      setShowSeboCreatedBanner(true);
      trackEvent("funnel_sebo_to_add_book");
    }
  }, []);

  const searchBookByISBN = async (isbnInput?: string) => {
    const isbnValue = isbnInput ?? formData.isbn;
    if (!isbnValue) {
      setCoverError("Digite um ISBN para buscar o livro");
      return;
    }

    if (!validateISBN(isbnValue)) {
      setCoverError("ISBN inválido. Use apenas números e hífens (10 ou 13 dígitos).");
      return;
    }

    setSearchingBook(true);
    setCoverError("");
    trackEvent("isbn_lookup_started");

    try {
      const isbnClean = normalizeISBN(isbnValue);
      if (curatedCoverByIsbn[isbnClean]) {
        setCoverUrl(curatedCoverByIsbn[isbnClean]);
        setCoverFile(null);
      }
      let found = false;
      let foundCover = false;

      // 1) Open Library
      const metaResp = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnClean}&format=json&jscmd=data`
      );
      if (metaResp.ok) {
        const data = await metaResp.json();
        const bookKey = `ISBN:${isbnClean}`;
        const bookInfo = data[bookKey];

        if (bookInfo) {
          setFormData((prev) => ({
            ...prev,
            title: bookInfo.title || prev.title,
            author: bookInfo.authors?.[0]?.name || prev.author,
            pages: bookInfo.number_of_pages?.toString() || prev.pages,
            year: bookInfo.publish_date?.match(/\d{4}/)?.[0] || prev.year,
            description:
              typeof bookInfo.notes === "string" ? bookInfo.notes : prev.description,
          }));

          if (bookInfo.cover?.large || bookInfo.cover?.medium) {
            setCoverUrl(bookInfo.cover.large || bookInfo.cover.medium);
            setCoverFile(null);
            foundCover = true;
          }
          found = true;
        }
      }

      // 2) Google Books fallback
      if (!found) {
        const googleResp = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnClean}&maxResults=1`
        );
        if (googleResp.ok) {
          const googleData = await googleResp.json();
          const item = googleData?.items?.[0];
          const info = item?.volumeInfo;
          if (info) {
            setFormData((prev) => ({
              ...prev,
              title: info.title || prev.title,
              author: info.authors?.[0] || prev.author,
              pages: info.pageCount ? String(info.pageCount) : prev.pages,
              year: info.publishedDate?.match(/\d{4}/)?.[0] || prev.year,
              description: info.description || prev.description,
            }));

            const thumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
            if (thumb) {
              setCoverUrl(String(thumb).replace("http://", "https://"));
              setCoverFile(null);
              foundCover = true;
            }
            found = true;
          }
        }
      }

      // 3) Open Library direct cover fallback
      if (!foundCover) {
        const directCoverUrl = `https://covers.openlibrary.org/b/isbn/${isbnClean}-L.jpg`;
        const checkCover = await fetch(directCoverUrl, { method: "HEAD" });
        if (checkCover.ok && !checkCover.url.includes("blank")) {
          setCoverUrl(directCoverUrl);
          setCoverFile(null);
          foundCover = true;
        }
      }

      if (found) {
        const normalizedTitle = (formData.title || "").trim().toLowerCase();
        if (!foundCover && normalizedTitle && curatedCoverByTitle[normalizedTitle]) {
          setCoverUrl(curatedCoverByTitle[normalizedTitle]);
          setCoverFile(null);
          foundCover = true;
        }
        trackEvent("isbn_lookup_success", { isbn: isbnClean, cover: foundCover });
        toast.success("Dados do livro encontrados!");
      } else {
        trackEvent("isbn_lookup_not_found", { isbn: isbnClean });
        setCoverError("Livro não encontrado nas bases. Preencha manualmente.");
      }
    } catch (error) {
      trackEvent("isbn_lookup_error");
      setCoverError("Erro de conexão. Tente novamente em alguns minutos.");
    } finally {
      setSearchingBook(false);
    }
  };

  const stopScanner = () => {
    scannerActiveRef.current = false;
    setScannerBusy(false);
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setScannerOpen(false);
  };

  const extractISBNFromRaw = (raw: string): string | null => {
    const normalized = normalizeISBN(raw);
    if (validateISBN(normalized)) return normalized;

    const candidates = raw.match(/\b(?:97[89][0-9X\- ]{10,}|[0-9X\- ]{10,})\b/g) || [];
    for (const candidate of candidates) {
      const clean = normalizeISBN(candidate);
      if (validateISBN(clean)) {
        return clean;
      }
    }
    return null;
  };

  const startScanner = async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Seu navegador não suporta acesso à câmera.");
      return;
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setScannerError("Leitura de código por câmera não suportada neste navegador.");
      return;
    }

    try {
      setScannerError("");
      setScannerOpen(true);
      setScannerBusy(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Visualização da câmera indisponível.");
      }
      video.srcObject = stream;
      await video.play();

      const detector = new BarcodeDetectorCtor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      scannerActiveRef.current = true;

      const scanLoop = async () => {
        if (!scannerActiveRef.current || !videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes?.length) {
            for (const barcode of barcodes) {
              const rawValue = String(barcode.rawValue || "");
              const isbnFound = extractISBNFromRaw(rawValue);
              if (isbnFound) {
                setFormData((prev) => ({ ...prev, isbn: isbnFound }));
                toast.success(`ISBN detectado: ${isbnFound}`);
                stopScanner();
                await searchBookByISBN(isbnFound);
                return;
              }
            }
          }
        } catch {
          // Keep loop alive while scanner is active.
        }

        scanFrameRef.current = requestAnimationFrame(() => {
          void scanLoop();
        });
      };

      void scanLoop();
    } catch (error) {
      stopScanner();
      setScannerError(
        error instanceof Error ? error.message : "Não foi possível iniciar a câmera."
      );
    } finally {
      setScannerBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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

    const normalizedPrice = Number(formData.price.replace(",", "."));
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      toast.error("Informe um preço válido");
      return;
    }

    try {
      setIsUploading(true);

      let finalCoverUrl = coverUrl;
      if (coverFile) {
        toast.error("Upload manual de capa desativado nesta versão Cloudflare-only. Use ISBN para preencher automaticamente.");
        setIsUploading(false);
        return;
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
        isbn: formData.isbn ? normalizeISBN(formData.isbn) : undefined,
        category: formData.category || "Outros",
        description: formData.description || undefined,
        price: normalizedPrice,
        condition: formData.condition,
        availabilityStatus: formData.availabilityStatus,
        pages: formData.pages ? parseInt(formData.pages) : undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        coverUrl: finalCoverUrl || undefined,
      });

      trackEvent("book_create_success", { category: formData.category || "Outros" });
      toast.success("Livro cadastrado com sucesso! 📚");
      setTimeout(() => navigate("/"), 1500);
    } catch (error: any) {
      trackEvent("book_create_error", { message: error?.message ?? "unknown" });
      toast.error(error.message || "Erro ao cadastrar livro");
    } finally {
      setIsUploading(false);
    }
  };

  const canManageBooks = role === "livreiro" || role === "admin";
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }
  if (!isAuthenticated || !canManageBooks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-700">Apenas livreiros e admins podem cadastrar livros.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

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

      <main className="container flex-1 py-12">
        {showSeboCreatedBanner && (
          <div className="max-w-2xl mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-inter text-sm">
              Sebo criado com sucesso. Agora adicione seu primeiro livro para começar a vender.
            </p>
          </div>
        )}
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
                  {seboLoading && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 font-inter text-sm">
                        Verificando se você já possui um sebo...
                      </p>
                    </div>
                  )}
                  {mySeboError && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-700 font-inter text-sm">
                        Sessão não autenticada. Selecione um sebo na lista para continuar.
                      </p>
                    </div>
                  )}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-inter text-sm">
                      <strong>Atenção:</strong> Selecione um sebo para vincular este livro.
                    </p>
                    <Link href="/sebo/novo">
                      <button className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-inter font-medium py-2 px-4 rounded-lg">
                        Criar Sebo
                      </button>
                    </Link>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sebo *
                    </label>
                    <select
                      required={!mySebo}
                      value={formData.seboId}
                      onChange={(e) => setFormData({ ...formData, seboId: e.target.value })}
                      disabled={sebosLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                    >
                      <option value="">Selecione um sebo</option>
                      {sebosList.map((sebo: any) => (
                        <option key={sebo.id} value={String(sebo.id)}>
                          {sebo.name}
                        </option>
                      ))}
                    </select>
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
                  <button
                    type="button"
                    onClick={() => void startScanner()}
                    disabled={scannerBusy}
                    className="w-full py-3 border-2 border-[#1f7a8c] text-[#1f7a8c] rounded-lg hover:bg-[#1f7a8c] hover:text-white disabled:opacity-50 transition-colors font-bold"
                  >
                    {scannerBusy ? "Abrindo câmera..." : "Escanear ISBN com câmera"}
                  </button>
                </div>
                {scannerOpen && (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      Aponte a câmera para o código de barras do livro.
                    </p>
                    <video
                      ref={videoRef}
                      className="w-full max-h-72 rounded-lg bg-black"
                      autoPlay
                      muted
                      playsInline
                    />
                    <button
                      type="button"
                      onClick={stopScanner}
                      className="mt-3 px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100"
                    >
                      Fechar câmera
                    </button>
                  </div>
                )}
                {coverError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">{coverError}</p>
                  </div>
                )}
                {scannerError && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-sm font-medium">{scannerError}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status do Anúncio</label>
              <select
                value={formData.availabilityStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    availabilityStatus: e.target.value as "ativo" | "reservado" | "vendido",
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
              >
                <option value="ativo">Disponível</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
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
              disabled={createBookMutation.isPending || isUploading || !canSubmit}
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
      </main>

      <Footer />
    </div>
  );
}
