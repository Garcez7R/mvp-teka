import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ALL_BOOK_CATEGORIES } from "@/lib/book-categories";
import { formatCurrencyFromDigits, parseCurrencyBRLToNumber, sanitizeFetchedDescription } from "@/lib/book-form";

type DraftStatus = "escaneado" | "revisado" | "pronto";
type DraftCondition = "Novo" | "Excelente" | "Bom estado" | "Usado" | "Desgastado";

type BatchDraft = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  description: string;
  pages: string;
  year: string;
  condition: DraftCondition;
  price: string;
  quantity: string;
  status: DraftStatus;
  coverUrl?: string;
  notes: string;
};

const CONDITIONS: DraftCondition[] = ["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"];
const BATCH_COUNTER_KEY = `teka_batch_scanned_${new Date().toISOString().slice(0, 10)}`;

export default function BatchScan() {
  const { isAuthenticated, role, loading } = useAuth({ redirectOnUnauthenticated: true });
  const canManageBooks = role === "livreiro" || role === "admin";
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [defaultCondition, setDefaultCondition] = useState<DraftCondition>("Usado");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "todos">("todos");
  const [drafts, setDrafts] = useState<BatchDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [scannedToday, setScannedToday] = useState(0);

  const lastDetectedRef = useRef<{ isbn: string; at: number } | null>(null);
  const scannerActiveRef = useRef(false);
  const scanFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const createBookMutation = trpc.books.create.useMutation();
  const { data: mySebo } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated && canManageBooks,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const value = Number.parseInt(window.localStorage.getItem(BATCH_COUNTER_KEY) || "0", 10);
    setScannedToday(Number.isFinite(value) ? value : 0);
  }, []);

  const incrementScannedToday = () => {
    setScannedToday((prev) => {
      const next = prev + 1;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(BATCH_COUNTER_KEY, String(next));
      }
      return next;
    });
  };

  const ensureAudioContextReady = async () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (!ctx) return null;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      return ctx;
    } catch {
      return null;
    }
  };

  const beepAndVibrate = async () => {
    try {
      const ctx = await ensureAudioContextReady();
      if (ctx) {
        const pulse = (when: number, frequency: number) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.type = "square";
          oscillator.frequency.value = frequency;
          gainNode.gain.value = 0.0001;
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          const startAt = ctx.currentTime + when;
          gainNode.gain.exponentialRampToValueAtTime(0.16, startAt + 0.004);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.085);
          oscillator.start(startAt);
          oscillator.stop(startAt + 0.09);
        };
        // Two quick pulses similar to handheld scanners.
        pulse(0, 980);
        pulse(0.1, 1240);
      }
    } catch {
      // Ignore sound errors.
    }
    try {
      navigator.vibrate?.(120);
    } catch {
      // Ignore vibration errors.
    }
  };

  const normalizeISBN = (raw: string) => raw.toUpperCase().replace(/[^0-9X]/g, "");
  const isValidISBN = (raw: string) => {
    const clean = normalizeISBN(raw);
    return (/^\d{13}$/).test(clean) || (/^\d{9}[\dX]$/).test(clean);
  };

  const fetchBookMetaByIsbn = async (isbn: string) => {
    const clean = normalizeISBN(isbn);
    const fallback = {
      title: `Livro ${clean}`,
      author: "Autor não informado",
      category: "Outros",
      description: "",
      pages: "",
      year: "",
      coverUrl: "",
    };
    try {
      const olRes = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
      );
      if (olRes.ok) {
        const data = await olRes.json();
        const info = data[`ISBN:${clean}`];
        if (info) {
          return {
            title: String(info.title || fallback.title),
            author: String(info.authors?.[0]?.name || fallback.author),
            category: fallback.category,
            description: sanitizeFetchedDescription(typeof info.notes === "string" ? info.notes : "") || "",
            pages: info.number_of_pages ? String(info.number_of_pages) : "",
            year: String(info.publish_date?.match(/\d{4}/)?.[0] || ""),
            coverUrl: String(info.cover?.large || info.cover?.medium || ""),
          };
        }
      }
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`
      );
      if (gbRes.ok) {
        const data = await gbRes.json();
        const info = data?.items?.[0]?.volumeInfo;
        if (info) {
          return {
            title: String(info.title || fallback.title),
            author: String(info.authors?.[0] || fallback.author),
            category: String(info.categories?.[0] || fallback.category),
            description: sanitizeFetchedDescription(info.description) || "",
            pages: info.pageCount ? String(info.pageCount) : "",
            year: String(info.publishedDate?.match(/\d{4}/)?.[0] || ""),
            coverUrl: String(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "").replace("http://", "https://"),
          };
        }
      }
      const gbLooseRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(clean)}&maxResults=1`
      );
      if (gbLooseRes.ok) {
        const data = await gbLooseRes.json();
        const info = data?.items?.[0]?.volumeInfo;
        if (info) {
          return {
            title: String(info.title || fallback.title),
            author: String(info.authors?.[0] || fallback.author),
            category: String(info.categories?.[0] || fallback.category),
            description: sanitizeFetchedDescription(info.description) || "",
            pages: info.pageCount ? String(info.pageCount) : "",
            year: String(info.publishedDate?.match(/\d{4}/)?.[0] || ""),
            coverUrl: String(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "").replace("http://", "https://"),
          };
        }
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const addDraftFromIsbn = async (rawIsbn: string) => {
    const isbn = normalizeISBN(rawIsbn);
    if (!isValidISBN(isbn)) {
      toast.error("ISBN inválido para scan em lote.");
      return;
    }

    const now = Date.now();
    const last = lastDetectedRef.current;
    if (last && last.isbn === isbn && now - last.at < 2500) {
      return;
    }
    lastDetectedRef.current = { isbn, at: now };

    void beepAndVibrate();
    const meta = await fetchBookMetaByIsbn(isbn);
    const defaultPriceValue = defaultPrice || "0,00";

    setDrafts((prev) => {
      const existingIdx = prev.findIndex(
        (draft) =>
          draft.isbn === isbn &&
          draft.condition === defaultCondition &&
          parseCurrencyBRLToNumber(draft.price) === parseCurrencyBRLToNumber(defaultPriceValue)
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const currentQty = Number.parseInt(copy[existingIdx].quantity || "1", 10);
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: String(Math.max(1, currentQty + 1)),
          status: "escaneado",
        };
        return copy;
      }
      const normalizedCategory = ALL_BOOK_CATEGORIES.includes(meta.category as any)
        ? meta.category
        : "Outros";
      return [
        {
          id: `${isbn}-${now}`,
          isbn,
          title: meta.title,
          author: meta.author,
          category: normalizedCategory,
          description: meta.description,
          pages: meta.pages,
          year: meta.year,
          coverUrl: meta.coverUrl || undefined,
          condition: defaultCondition,
          price: defaultPriceValue,
          quantity: "1",
          status: "escaneado",
          notes: "",
        },
        ...prev,
      ];
    });
    incrementScannedToday();
    toast.success(`Escaneado: ${isbn}`);
  };

  const stopScanner = () => {
    scannerActiveRef.current = false;
    setScannerBusy(false);
    if (scanFrameRef.current) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  };

  const startScanner = async () => {
    if (!(window as any).BarcodeDetector) {
      setScannerError("Detector de código não suportado neste navegador. Use ISBN manual abaixo.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Câmera não suportada neste dispositivo.");
      return;
    }
    try {
      setScannerError("");
      setScannerBusy(true);
      setScannerOpen(true);
      await ensureAudioContextReady();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Preview indisponível");
      video.srcObject = stream;
      await video.play();
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      scannerActiveRef.current = true;
      const loop = async () => {
        if (!scannerActiveRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes || []) {
            const raw = String(code?.rawValue || "");
            if (raw) {
              void addDraftFromIsbn(raw);
              break;
            }
          }
        } catch {
          // keep running
        }
        scanFrameRef.current = requestAnimationFrame(() => void loop());
      };
      void loop();
    } catch (error) {
      setScannerError(error instanceof Error ? error.message : "Falha ao abrir scanner");
      stopScanner();
    } finally {
      setScannerBusy(false);
    }
  };

  useEffect(() => () => stopScanner(), []);

  const filteredDrafts = useMemo(
    () => drafts.filter((draft) => (statusFilter === "todos" ? true : draft.status === statusFilter)),
    [drafts, statusFilter]
  );

  const pendingPriceCount = useMemo(
    () => drafts.filter((draft) => parseCurrencyBRLToNumber(draft.price) <= 0).length,
    [drafts]
  );

  const updateDraft = (id: string, patch: Partial<BatchDraft>) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch, status: patch.status ?? "revisado" } : draft))
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const saveDrafts = async () => {
    if (!mySebo?.id) {
      toast.error("Crie ou selecione um sebo antes de salvar.");
      return;
    }
    const ready = drafts.filter((draft) => parseCurrencyBRLToNumber(draft.price) > 0);
    if (!ready.length) {
      toast.error("Nenhum item com preço válido para salvar.");
      return;
    }
    setSaving(true);
    try {
      for (const draft of ready) {
        const quantity = Number.parseInt(draft.quantity || "1", 10);
        await createBookMutation.mutateAsync({
          seboId: mySebo.id,
          title: draft.title || `Livro ${draft.isbn}`,
          author: draft.author || "Autor não informado",
          isbn: draft.isbn,
          category: draft.category || "Outros",
          description: draft.notes || draft.description || undefined,
          price: parseCurrencyBRLToNumber(draft.price),
          condition: draft.condition,
          pages: draft.pages ? Number.parseInt(draft.pages, 10) : undefined,
          year: draft.year ? Number.parseInt(draft.year, 10) : undefined,
          coverUrl: draft.coverUrl || undefined,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          availabilityStatus: "ativo",
          isVisible: true,
        });
      }
      toast.success(`${ready.length} item(ns) salvos no catálogo.`);
      setDrafts([]);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao salvar scan em lote.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!isAuthenticated || !canManageBooks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-700">Apenas livreiros e admins podem usar scan em lote.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-10">
        <Link href="/add-book">
          <button className="flex items-center gap-2 text-gray-600 hover:text-[#262969] transition-colors font-inter text-sm font-medium mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao cadastro manual
          </button>
        </Link>

        <h1 className="font-outfit font-bold text-3xl text-[#262969] mb-2">Scan em Lote</h1>
        <p className="text-gray-600 mb-6">
          Escaneie ISBN continuamente no celular e revise antes de publicar no catálogo.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 border rounded bg-white">
            <p className="text-xs text-gray-500">Escaneados hoje</p>
            <p className="text-xl font-bold text-[#262969]">{scannedToday}</p>
          </div>
          <div className="p-3 border rounded bg-white">
            <p className="text-xs text-gray-500">Na fila</p>
            <p className="text-xl font-bold text-[#262969]">{drafts.length}</p>
          </div>
          <div className="p-3 border rounded bg-white">
            <p className="text-xs text-gray-500">Sem preço</p>
            <p className="text-xl font-bold text-amber-700">{pendingPriceCount}</p>
          </div>
          <div className="p-3 border rounded bg-white">
            <p className="text-xs text-gray-500">Sebo</p>
            <p className="text-sm font-semibold text-[#262969] truncate">{mySebo?.name || "Não definido"}</p>
          </div>
        </div>

        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              value={defaultCondition}
              onChange={(e) => setDefaultCondition(e.target.value as DraftCondition)}
              className="px-3 py-2 border rounded bg-white"
            >
              {CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(formatCurrencyFromDigits(e.target.value))}
              placeholder="Preço padrão (opcional)"
              className="px-3 py-2 border rounded bg-white"
            />
            <button
              type="button"
              onClick={() => void startScanner()}
              disabled={scannerBusy || scannerOpen}
              className="px-4 py-2 rounded bg-[#262969] text-white disabled:opacity-50"
            >
              {scannerBusy ? "Abrindo câmera..." : scannerOpen ? "Scanner ativo" : "Iniciar scanner contínuo"}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              placeholder="ISBN manual (fallback)"
              className="flex-1 px-3 py-2 border rounded bg-white"
            />
            <button
              type="button"
              onClick={() => {
                void ensureAudioContextReady();
                void addDraftFromIsbn(manualIsbn);
                setManualIsbn("");
              }}
              className="px-4 py-2 rounded border border-[#262969] text-[#262969]"
            >
              Adicionar
            </button>
            {scannerOpen && (
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-2 rounded border border-gray-400 text-gray-700"
              >
                Parar scanner
              </button>
            )}
          </div>

          {scannerOpen && (
            <div className="mt-3">
              <video ref={videoRef} className="w-full max-h-80 rounded bg-black" autoPlay muted playsInline />
            </div>
          )}
          {scannerError && (
            <p className="mt-3 text-sm text-amber-700 font-medium">{scannerError}</p>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("todos")}
              className={`px-3 py-1.5 rounded border ${statusFilter === "todos" ? "border-[#262969] text-[#262969]" : "border-gray-300 text-gray-600"}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("escaneado")}
              className={`px-3 py-1.5 rounded border ${statusFilter === "escaneado" ? "border-[#262969] text-[#262969]" : "border-gray-300 text-gray-600"}`}
            >
              Escaneados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("revisado")}
              className={`px-3 py-1.5 rounded border ${statusFilter === "revisado" ? "border-[#262969] text-[#262969]" : "border-gray-300 text-gray-600"}`}
            >
              Revisados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pronto")}
              className={`px-3 py-1.5 rounded border ${statusFilter === "pronto" ? "border-[#262969] text-[#262969]" : "border-gray-300 text-gray-600"}`}
            >
              Prontos
            </button>
          </div>
          <button
            type="button"
            onClick={() => void saveDrafts()}
            disabled={saving || drafts.length === 0}
            className="px-4 py-2 rounded bg-[#da4653] text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar itens no catálogo
          </button>
        </div>

        <div className="space-y-3">
          {filteredDrafts.map((draft) => (
            <div key={draft.id} className="border rounded-lg p-3 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                <input value={draft.isbn} readOnly className="px-2 py-2 border rounded bg-gray-50 text-sm" />
                <input
                  value={draft.title}
                  onChange={(e) => updateDraft(draft.id, { title: e.target.value })}
                  className="px-2 py-2 border rounded text-sm md:col-span-2"
                />
                <input
                  value={draft.author}
                  onChange={(e) => updateDraft(draft.id, { author: e.target.value })}
                  className="px-2 py-2 border rounded text-sm"
                />
                <select
                  value={draft.condition}
                  onChange={(e) => updateDraft(draft.id, { condition: e.target.value as DraftCondition })}
                  className="px-2 py-2 border rounded text-sm"
                >
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
                <input
                  value={draft.price}
                  onChange={(e) => updateDraft(draft.id, { price: formatCurrencyFromDigits(e.target.value) })}
                  className="px-2 py-2 border rounded text-sm"
                  placeholder="Preço"
                />
                <input
                  value={draft.quantity}
                  onChange={(e) => updateDraft(draft.id, { quantity: e.target.value })}
                  className="px-2 py-2 border rounded text-sm"
                  placeholder="Qtd"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                <select
                  value={draft.category}
                  onChange={(e) => updateDraft(draft.id, { category: e.target.value })}
                  className="px-2 py-2 border rounded text-sm"
                >
                  {ALL_BOOK_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={draft.status}
                  onChange={(e) => updateDraft(draft.id, { status: e.target.value as DraftStatus })}
                  className="px-2 py-2 border rounded text-sm"
                >
                  <option value="escaneado">Escaneado</option>
                  <option value="revisado">Revisado</option>
                  <option value="pronto">Pronto para venda</option>
                </select>
                <input
                  value={draft.notes}
                  onChange={(e) => updateDraft(draft.id, { notes: e.target.value })}
                  className="px-2 py-2 border rounded text-sm md:col-span-2"
                  placeholder="Observações do exemplar (opcional)"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => removeDraft(draft.id)}
                  className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
          {filteredDrafts.length === 0 && (
            <div className="p-6 border rounded-lg bg-white text-gray-600 text-sm">
              Nenhum item nesta visualização.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
