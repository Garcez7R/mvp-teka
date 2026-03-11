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
  coverOptions: string[];
  notes: string;
};

const CONDITIONS: DraftCondition[] = ["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"];
const BATCH_COUNTER_KEY = `teka_batch_scanned_${new Date().toISOString().slice(0, 10)}`;

export default function BatchScan() {
  const loginRedirect = useMemo(() => {
    if (typeof window === "undefined") return "/login";
    const next = `${window.location.pathname}${window.location.search}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, []);
  const { isAuthenticated, role, loading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: loginRedirect,
  });
  const canManageBooks = role === "livreiro" || role === "admin";
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerEngine, setScannerEngine] = useState<"barcode" | "tesseract">("barcode");
  const [waitingNextScan, setWaitingNextScan] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");
  const [defaultCondition, setDefaultCondition] = useState<DraftCondition>("Usado");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "todos">("todos");
  const [drafts, setDrafts] = useState<BatchDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [scannedToday, setScannedToday] = useState(0);

  const lastDetectedRef = useRef<{ isbn: string; at: number } | null>(null);
  const scannerActiveRef = useRef(false);
  const waitingNextScanRef = useRef(false);
  const scanFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tesseractLoaderRef = useRef<Promise<any> | null>(null);

  const setScanPaused = (value: boolean) => {
    waitingNextScanRef.current = value;
    setWaitingNextScan(value);
  };

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
  const normalizeCoverUrl = (value?: string | null): string | null => {
    if (!value) return null;
    return String(value).replace("http://", "https://");
  };
  const dedupeCoverUrls = (values: Array<string | null | undefined>) => {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const value of values) {
      const safeValue = normalizeCoverUrl(value);
      if (!safeValue || seen.has(safeValue)) continue;
      seen.add(safeValue);
      normalized.push(safeValue);
    }
    return normalized;
  };
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
      coverOptions: [] as string[],
    };
    try {
      const olRes = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
      );
      if (olRes.ok) {
        const data = await olRes.json();
        const info = data[`ISBN:${clean}`];
        if (info) {
          const coverOptions = dedupeCoverUrls([
            info.cover?.large,
            info.cover?.medium,
            info.cover?.small,
            `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`,
            `https://covers.openlibrary.org/b/isbn/${clean}-M.jpg`,
          ]);
          return {
            title: String(info.title || fallback.title),
            author: String(info.authors?.[0]?.name || fallback.author),
            category: fallback.category,
            description: sanitizeFetchedDescription(typeof info.notes === "string" ? info.notes : "") || "",
            pages: info.number_of_pages ? String(info.number_of_pages) : "",
            year: String(info.publish_date?.match(/\d{4}/)?.[0] || ""),
            coverUrl: String(coverOptions[0] || ""),
            coverOptions,
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
          const coverOptions = dedupeCoverUrls([
            info.imageLinks?.extraLarge,
            info.imageLinks?.large,
            info.imageLinks?.medium,
            info.imageLinks?.small,
            info.imageLinks?.thumbnail,
            info.imageLinks?.smallThumbnail,
            `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`,
          ]);
          return {
            title: String(info.title || fallback.title),
            author: String(info.authors?.[0] || fallback.author),
            category: String(info.categories?.[0] || fallback.category),
            description: sanitizeFetchedDescription(info.description) || "",
            pages: info.pageCount ? String(info.pageCount) : "",
            year: String(info.publishedDate?.match(/\d{4}/)?.[0] || ""),
            coverUrl: String(coverOptions[0] || ""),
            coverOptions,
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
          const coverOptions = dedupeCoverUrls([
            info.imageLinks?.extraLarge,
            info.imageLinks?.large,
            info.imageLinks?.medium,
            info.imageLinks?.small,
            info.imageLinks?.thumbnail,
            info.imageLinks?.smallThumbnail,
            `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`,
          ]);
          return {
            title: String(info.title || fallback.title),
            author: String(info.authors?.[0] || fallback.author),
            category: String(info.categories?.[0] || fallback.category),
            description: sanitizeFetchedDescription(info.description) || "",
            pages: info.pageCount ? String(info.pageCount) : "",
            year: String(info.publishedDate?.match(/\d{4}/)?.[0] || ""),
            coverUrl: String(coverOptions[0] || ""),
            coverOptions,
          };
        }
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const addDraftFromIsbn = async (
    rawIsbn: string,
    options?: { pauseAfterRead?: boolean }
  ) => {
    const isbn = normalizeISBN(rawIsbn);
    if (!isValidISBN(isbn)) {
      toast.error("ISBN inválido para scan em lote.");
      return false;
    }

    const now = Date.now();
    const last = lastDetectedRef.current;
    if (last && last.isbn === isbn && now - last.at < 2500) {
      return false;
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
          coverOptions: meta.coverOptions || [],
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
    if (options?.pauseAfterRead) {
      setScanPaused(true);
      setScannerError("Leitura concluída. Toque em Próximo scan para continuar.");
    }
    return true;
  };

  const stopScanner = () => {
    scannerActiveRef.current = false;
    setScanPaused(false);
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
    setScannerEngine("barcode");
  };

  const loadTesseract = async () => {
    if (typeof window === "undefined") {
      throw new Error("OCR indisponível neste ambiente.");
    }
    if ((window as any).Tesseract?.recognize) {
      return (window as any).Tesseract;
    }
    if (!tesseractLoaderRef.current) {
      tesseractLoaderRef.current = new Promise((resolve, reject) => {
        const scriptId = "teka-tesseract-cdn";
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve((window as any).Tesseract));
          existingScript.addEventListener("error", () => reject(new Error("Falha ao carregar OCR.")));
          return;
        }
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.async = true;
        script.onload = () => resolve((window as any).Tesseract);
        script.onerror = () => reject(new Error("Falha ao carregar OCR."));
        document.head.appendChild(script);
      });
    }
    return tesseractLoaderRef.current;
  };

  const captureFrameDataUrl = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const sourceW = video.videoWidth;
    const sourceH = video.videoHeight;
    const cropW = Math.floor(sourceW * 0.82);
    const cropH = Math.floor(sourceH * 0.62);
    const cropX = Math.floor((sourceW - cropW) / 2);
    const cropY = Math.floor((sourceH - cropH) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(640, cropW);
    canvas.height = Math.max(360, cropH);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const extractIsbnFromRaw = (raw: string): string | null => {
    const normalized = normalizeISBN(raw);
    if (isValidISBN(normalized)) return normalized;
    const candidates = raw.match(/\b(?:97[89][0-9X\- ]{10,}|[0-9X\- ]{10,})\b/g) || [];
    for (const candidate of candidates) {
      const clean = normalizeISBN(candidate);
      if (isValidISBN(clean)) {
        return clean;
      }
    }
    return null;
  };

  const captureBarcodeByOcr = async () => {
    try {
      setScannerBusy(true);
      setScannerError("Processando captura para ler ISBN...");
      const frame = captureFrameDataUrl();
      if (!frame) {
        setScannerError("Não foi possível capturar imagem da câmera.");
        return;
      }
      const tesseract = await loadTesseract();
      const result = await tesseract.recognize(frame, "eng", {
        tessedit_pageseg_mode: "6",
        tessedit_char_whitelist: "0123456789Xx- ",
      });
      const isbnFound = extractIsbnFromRaw(String(result?.data?.text || ""));
      if (!isbnFound) {
        setScannerError("ISBN não identificado. Aproxime mais o código e tente novamente.");
        return;
      }
      await addDraftFromIsbn(isbnFound);
      setScannerError("ISBN capturado no modo compatível.");
    } catch {
      setScannerError("Falha ao capturar ISBN no modo compatível.");
    } finally {
      setScannerBusy(false);
    }
  };

  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Câmera não suportada neste dispositivo.");
      return;
    }
    const hasBarcodeDetector = Boolean((window as any).BarcodeDetector);
    try {
      setScannerError("");
      setScannerBusy(true);
      setScanPaused(false);
      setScannerOpen(true);
      setScannerEngine(hasBarcodeDetector ? "barcode" : "tesseract");
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
      if (!hasBarcodeDetector) {
        setScannerError("Detector de código não suportado neste navegador. Use Capturar ISBN (modo compatível).");
        return;
      }
      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      scannerActiveRef.current = true;
      const loop = async () => {
        if (!scannerActiveRef.current || !videoRef.current) return;
        if (waitingNextScanRef.current) {
          scanFrameRef.current = requestAnimationFrame(() => void loop());
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          for (const code of codes || []) {
            const raw = String(code?.rawValue || "");
            if (raw) {
              await addDraftFromIsbn(raw, { pauseAfterRead: true });
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    if (scannerOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    document.body.style.overflow = previousOverflow;
    return undefined;
  }, [scannerOpen]);

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

  const fetchCoverOptionsByQuery = async (draft: BatchDraft) => {
    const query = [draft.title, draft.author].filter(Boolean).join(" ").trim();
    if (!query) {
      toast.error("Informe título/autor para buscar capas.");
      return;
    }
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6`
      );
      if (!response.ok) {
        toast.error("Não foi possível buscar capas agora.");
        return;
      }
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const options = dedupeCoverUrls(
        items.flatMap((item: any) => {
          const links = item?.volumeInfo?.imageLinks;
          return [
            links?.extraLarge,
            links?.large,
            links?.medium,
            links?.small,
            links?.thumbnail,
            links?.smallThumbnail,
          ];
        })
      );
      if (!options.length) {
        toast.error("Nenhuma capa encontrada para este título/autor.");
        return;
      }
      updateDraft(draft.id, {
        coverOptions: options,
        coverUrl: options[0],
      });
      toast.success(`Encontradas ${options.length} opções de capa.`);
    } catch {
      toast.error("Falha ao buscar capas.");
    }
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
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
          Escaneie ISBN no celular em modo controlado (um por vez) e revise antes de publicar no catálogo.
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
              {scannerBusy ? "Abrindo câmera..." : scannerOpen ? "Scanner ativo" : "Iniciar scanner"}
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
                onClick={() => {
                  setScanPaused(false);
                  setScannerError("");
                }}
                disabled={!waitingNextScan || scannerEngine !== "barcode"}
                className="px-4 py-2 rounded border border-[#262969] text-[#262969] disabled:opacity-50"
              >
                {waitingNextScan && scannerEngine === "barcode"
                  ? "Próximo scan"
                  : "Aguardando leitura"}
              </button>
            )}
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
            <p className="mt-3 text-sm text-blue-700 font-medium">
              Scanner aberto em tamanho otimizado para melhor leitura.
            </p>
          )}
          {scannerError && (
            <p className="mt-3 text-sm text-amber-700 font-medium">{scannerError}</p>
          )}
        </div>

        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
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
            className="w-full md:w-auto px-4 py-2 rounded bg-[#da4653] text-white disabled:opacity-50 flex items-center justify-center gap-2"
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
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {draft.coverOptions?.slice(0, 6).map((coverOption) => (
                  <button
                    key={coverOption}
                    type="button"
                    onClick={() => updateDraft(draft.id, { coverUrl: coverOption })}
                    className={`rounded border-2 overflow-hidden ${
                      draft.coverUrl === coverOption
                        ? "border-[#da4653]"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img src={coverOption} alt="Opção de capa" className="w-full h-24 object-cover" />
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void fetchCoverOptionsByQuery(draft)}
                  className="px-3 py-1.5 text-xs rounded border border-[#262969] text-[#262969] hover:bg-[#262969] hover:text-white"
                >
                  Buscar capas por título/autor
                </button>
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
        {scannerOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm md:max-w-lg">
              <p className="text-white text-sm mb-3">
                Aponte para o código de barras. Após cada leitura, toque em Próximo scan.
              </p>
              <video
                ref={videoRef}
                className="w-full h-[40vh] md:h-[48vh] rounded-xl bg-black border border-white/20 object-cover"
                autoPlay
                muted
                playsInline
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {scannerEngine === "tesseract" && (
                  <button
                    type="button"
                    onClick={() => void captureBarcodeByOcr()}
                    disabled={scannerBusy}
                    className="px-4 py-2 rounded border border-[#8ea4ff] text-[#dce3ff] hover:bg-[#262969] disabled:opacity-50"
                  >
                    {scannerBusy ? "Processando..." : "Capturar ISBN (modo compatível)"}
                  </button>
                )}
                {scannerEngine === "barcode" && (
                  <button
                    type="button"
                    onClick={() => {
                      setScanPaused(false);
                      setScannerError("");
                    }}
                    disabled={!waitingNextScan}
                    className="px-4 py-2 rounded border border-[#8ea4ff] text-[#dce3ff] hover:bg-[#262969] disabled:opacity-50"
                  >
                    {waitingNextScan ? "Próximo scan" : "Aguardando leitura"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-4 py-2 rounded border border-white/40 text-white hover:bg-white/10"
                >
                  Parar scanner
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
