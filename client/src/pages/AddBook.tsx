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
import {
  formatCurrencyFromDigits,
  parseCurrencyBRLToNumber,
  sanitizeFetchedDescription,
} from "@/lib/book-form";
import { ALL_BOOK_CATEGORIES } from "@/lib/book-categories";

type BookSuggestion = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  pages: string;
  year: string;
  description: string;
  coverOptions: string[];
};

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
    quantity: "1",
    condition: "Bom estado" as const,
    availabilityStatus: "ativo" as "ativo" | "reservado" | "vendido",
    pages: "",
    year: "",
  });

  const [creatingSebo, setCreatingSebo] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverCandidates, setCoverCandidates] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookSuggestions, setBookSuggestions] = useState<BookSuggestion[]>([]);
  const [searchingBook, setSearchingBook] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [isbnValid, setIsbnValid] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSeboCreatedBanner, setShowSeboCreatedBanner] = useState(false);
  const [hasLastDraft, setHasLastDraft] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerMode, setScannerMode] = useState<"barcode" | "cover">("barcode");
  const [scannerEngine, setScannerEngine] = useState<"barcode" | "text" | "tesseract">("barcode");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isbnInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerActiveRef = useRef(false);
  const scanFrameRef = useRef<number | null>(null);
  const autoScanTriggeredRef = useRef(false);
  const tesseractLoaderRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const createBookMutation = trpc.books.create.useMutation();
  const LAST_BOOK_DRAFT_KEY = "teka_last_book_draft";
  const { data: sebosList = [], isLoading: sebosLoading } = trpc.sebos.list.useQuery(undefined, {
    enabled: isAuthenticated && role === "admin",
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const { data: mySebos = [], isLoading: mySebosLoading } = trpc.sebos.listMine.useQuery(undefined, {
    enabled: isAuthenticated && role !== "admin",
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const availableSebos = role === "admin" ? sebosList : mySebos;
  const canSubmit = Boolean(formData.seboId);

  const normalizeISBN = (isbn: string): string =>
    isbn.toUpperCase().replace(/[^0-9X]/g, "");
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
  const extractIsbnFromIdentifiers = (identifiers: any[]): string => {
    if (!Array.isArray(identifiers)) return "";
    const isbn13 = identifiers.find((identifier) => identifier?.type === "ISBN_13")?.identifier;
    const isbn10 = identifiers.find((identifier) => identifier?.type === "ISBN_10")?.identifier;
    return normalizeISBN(String(isbn13 || isbn10 || ""));
  };
  const toBookSuggestion = (item: any): BookSuggestion | null => {
    const info = item?.volumeInfo;
    if (!info?.title) return null;
    const coverOptions = dedupeCoverUrls([
      info.imageLinks?.extraLarge,
      info.imageLinks?.large,
      info.imageLinks?.medium,
      info.imageLinks?.small,
      info.imageLinks?.thumbnail,
      info.imageLinks?.smallThumbnail,
    ]);
    return {
      id: String(item?.id || info.title),
      title: String(info.title || ""),
      author: String(info.authors?.[0] || ""),
      isbn: extractIsbnFromIdentifiers(info.industryIdentifiers),
      pages: info.pageCount ? String(info.pageCount) : "",
      year: String(info.publishedDate?.match(/\d{4}/)?.[0] || ""),
      description: sanitizeFetchedDescription(info.description) || "",
      coverOptions,
    };
  };
  const applyBookSuggestion = (suggestion: BookSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      title: suggestion.title || prev.title,
      author: suggestion.author || prev.author,
      isbn: suggestion.isbn || prev.isbn,
      pages: suggestion.pages || prev.pages,
      year: suggestion.year || prev.year,
      description: suggestion.description || prev.description,
    }));
    if (suggestion.coverOptions[0]) {
      setCoverUrl(suggestion.coverOptions[0]);
      setCoverCandidates(suggestion.coverOptions);
      setCoverFile(null);
    }
    setCoverError("");
  };
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasDraft = Boolean(window.localStorage.getItem(LAST_BOOK_DRAFT_KEY));
    setHasLastDraft(hasDraft);
  }, []);

  useEffect(() => {
    if (!availableSebos.length) return;
    const selectedId = Number.parseInt(formData.seboId || "", 10);
    const stillExists = Number.isFinite(selectedId)
      ? availableSebos.some((sebo: any) => Number(sebo.id) === selectedId)
      : false;
    if (stillExists) return;
    setFormData((prev) => ({
      ...prev,
      seboId: String(availableSebos[0].id),
    }));
  }, [availableSebos, formData.seboId]);

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
    setBookSuggestions([]);
    trackEvent("isbn_lookup_started");

    try {
      const isbnClean = normalizeISBN(isbnValue);
      if (curatedCoverByIsbn[isbnClean]) {
        setCoverUrl(curatedCoverByIsbn[isbnClean]);
        setCoverFile(null);
      }
      let found = false;
      const candidateCovers: Array<string | null | undefined> = [];

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
              sanitizeFetchedDescription(
                typeof bookInfo.notes === "string" ? bookInfo.notes : undefined
              ) || prev.description,
          }));

          candidateCovers.push(
            bookInfo.cover?.large,
            bookInfo.cover?.medium,
            bookInfo.cover?.small
          );
          found = true;
        }
      }

      // 2) Google Books fallback
      if (!found || candidateCovers.length < 2) {
        const googleResp = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnClean}&maxResults=5`
        );
        if (googleResp.ok) {
          const googleData = await googleResp.json();
          const items = Array.isArray(googleData?.items) ? googleData.items : [];
          const first = items[0];
          const info = first?.volumeInfo;
          if (!found && info) {
            setFormData((prev) => ({
              ...prev,
              title: info.title || prev.title,
              author: info.authors?.[0] || prev.author,
              pages: info.pageCount ? String(info.pageCount) : prev.pages,
              year: info.publishedDate?.match(/\d{4}/)?.[0] || prev.year,
              description: sanitizeFetchedDescription(info.description) || prev.description,
            }));
            found = true;
          }
          for (const item of items) {
            const imageLinks = item?.volumeInfo?.imageLinks;
            candidateCovers.push(
              imageLinks?.extraLarge,
              imageLinks?.large,
              imageLinks?.medium,
              imageLinks?.small,
              imageLinks?.thumbnail,
              imageLinks?.smallThumbnail
            );
          }
        }
      }

      // 2.1) Google Books loose fallback by raw ISBN query
      if (!found) {
        const googleLooseResp = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(isbnClean)}&maxResults=5`
        );
        if (googleLooseResp.ok) {
          const googleLooseData = await googleLooseResp.json();
          const items = Array.isArray(googleLooseData?.items) ? googleLooseData.items : [];
          const first = items[0];
          const info = first?.volumeInfo;
          if (info) {
            setFormData((prev) => ({
              ...prev,
              title: info.title || prev.title,
              author: info.authors?.[0] || prev.author,
              pages: info.pageCount ? String(info.pageCount) : prev.pages,
              year: info.publishedDate?.match(/\d{4}/)?.[0] || prev.year,
              description: sanitizeFetchedDescription(info.description) || prev.description,
            }));
            found = true;
          }
          for (const item of items) {
            const imageLinks = item?.volumeInfo?.imageLinks;
            candidateCovers.push(
              imageLinks?.extraLarge,
              imageLinks?.large,
              imageLinks?.medium,
              imageLinks?.small,
              imageLinks?.thumbnail,
              imageLinks?.smallThumbnail
            );
          }
        }
      }

      // 3) Open Library direct cover fallback
      const openLibraryDirect = [
        `https://covers.openlibrary.org/b/isbn/${isbnClean}-L.jpg`,
        `https://covers.openlibrary.org/b/isbn/${isbnClean}-M.jpg`,
      ];
      for (const directCoverUrl of openLibraryDirect) {
        try {
          const checkCover = await fetch(directCoverUrl, { method: "HEAD" });
          if (checkCover.ok && !checkCover.url.includes("blank")) {
            candidateCovers.push(directCoverUrl);
          }
        } catch {
          // Ignore network hiccups for optional candidates.
        }
      }

      const uniqueCandidates = dedupeCoverUrls([
        curatedCoverByIsbn[isbnClean],
        ...candidateCovers,
      ]);
      setCoverCandidates(uniqueCandidates);
      if (uniqueCandidates[0]) {
        setCoverUrl(uniqueCandidates[0]);
        setCoverFile(null);
      }

      if (found) {
        const normalizedTitle = (formData.title || "").trim().toLowerCase();
        if (!uniqueCandidates.length && normalizedTitle && curatedCoverByTitle[normalizedTitle]) {
          setCoverUrl(curatedCoverByTitle[normalizedTitle]);
          setCoverCandidates([curatedCoverByTitle[normalizedTitle]]);
          setCoverFile(null);
        }
        trackEvent("isbn_lookup_success", { isbn: isbnClean, cover: uniqueCandidates.length > 0 });
        toast.success("Dados do livro encontrados!");
      } else {
        trackEvent("isbn_lookup_not_found", { isbn: isbnClean });
        setCoverError("ISBN detectado, mas sem metadados automáticos. Continue o cadastro manual (ISBN já preenchido).");
        setCoverCandidates([]);
      }
    } catch (error) {
      trackEvent("isbn_lookup_error");
      setCoverError("Erro de conexão. Tente novamente em alguns minutos.");
    } finally {
      setSearchingBook(false);
    }
  };

  const searchBookByText = async (queryInput: string) => {
    const query = queryInput.trim();
    if (!query) return false;

    setSearchingBook(true);
    setCoverError("");
    setBookSuggestions([]);
    trackEvent("text_lookup_started");

    try {
      const googleResp = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`
      );
      if (!googleResp.ok) {
        setCoverError("Não foi possível buscar livro por texto neste momento.");
        return false;
      }

      const googleData = await googleResp.json();
      const items = Array.isArray(googleData?.items) ? googleData.items : [];
      const suggestions = items
        .map((item: any) => toBookSuggestion(item))
        .filter((item: BookSuggestion | null): item is BookSuggestion => Boolean(item));
      if (!suggestions.length) {
        setCoverError("OCR concluído, mas não encontrei um livro confiável por título/autor.");
        setCoverCandidates([]);
        return false;
      }
      setBookSuggestions(suggestions);
      applyBookSuggestion(suggestions[0]);
      toast.success(`Encontramos ${suggestions.length} opção(ões) de livro. Se precisar, escolha outra abaixo.`);
      trackEvent("text_lookup_success");
      return true;
    } catch {
      trackEvent("text_lookup_error");
      setCoverError("Erro de conexão durante busca por texto.");
      return false;
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

  const extractISBNFromDetectedItems = (items: any[]): string | null => {
    for (const item of items) {
      const rawValue = String(item?.rawValue || item?.text || "");
      const isbnFound = extractISBNFromRaw(rawValue);
      if (isbnFound) {
        return isbnFound;
      }
    }
    return null;
  };

  const getCameraErrorMessage = (error: unknown): string => {
    if (error instanceof DOMException) {
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        return "Permissão de câmera negada. Se o app estiver instalado, libere em Configurações do sistema > Apps > Permissões > Câmera.";
      }
      if (error.name === "NotFoundError") {
        return "Nenhuma câmera foi encontrada neste dispositivo.";
      }
      if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        return "Não foi possível acessar a câmera. Feche outros apps que possam estar usando a câmera.";
      }
      if (error.name === "SecurityError") {
        return "Acesso à câmera bloqueado por segurança. Use HTTPS (ou localhost) para escanear.";
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "Não foi possível iniciar a câmera.";
  };

  const fallbackToManualIsbn = (message: string) => {
    setScannerError(`${message} Use o ISBN manualmente (ex: 9788535914849).`);
    window.setTimeout(() => {
      isbnInputRef.current?.focus();
    }, 50);
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

  const chooseScannerEngine = (mode: "barcode" | "cover"): "barcode" | "text" | "tesseract" | null => {
    if (typeof window === "undefined") return null;
    const barcodeSupported = typeof (window as any).BarcodeDetector === "function";
    const textSupported = typeof (window as any).TextDetector === "function";

    if (mode === "barcode") {
      if (barcodeSupported) return "barcode";
      if (textSupported) return "text";
      return "tesseract";
    }

    if (textSupported) return "text";
    return "tesseract";
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
    const cropW = Math.floor(sourceW * 0.8);
    const cropH = Math.floor(sourceH * 0.8);
    const cropX = Math.floor((sourceW - cropW) / 2);
    const cropY = Math.floor((sourceH - cropH) / 2);
    const maxOutW = 1100;
    const scale = Math.min(1, maxOutW / cropW);
    const outW = Math.max(480, Math.floor(cropW * scale));
    const outH = Math.max(320, Math.floor(cropH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const extractSearchQueryFromText = (rawText: string) => {
    return rawText
      .replace(/\s+/g, " ")
      .replace(/[^A-Za-zÀ-ÿ0-9 ]/g, " ")
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !/^\d+$/.test(token))
      .slice(0, 8)
      .join(" ");
  };

  const runTesseractOcrFromCamera = async () => {
    try {
      setScannerBusy(true);
      setScannerError("Processando foto da capa...");
      const frame = captureFrameDataUrl();
      if (!frame) {
        setScannerError("Não foi possível capturar imagem da câmera. Tente novamente.");
        return;
      }

      const remoteAbort = new AbortController();
      const remoteTimeout = window.setTimeout(() => remoteAbort.abort(), 22_000);
      let remoteOcrResponse: Response | null = null;
      try {
        remoteOcrResponse = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
          signal: remoteAbort.signal,
        });
      } catch {
        remoteOcrResponse = null;
      } finally {
        window.clearTimeout(remoteTimeout);
      }

      let extractedText = "";
      if (remoteOcrResponse?.ok) {
        const remotePayload = await remoteOcrResponse.json();
        extractedText = String(remotePayload?.text || "");
      } else {
        setScannerError("OCR remoto indisponível. Tentando OCR local...");
        const tesseract = await loadTesseract();
        const isbnPass = await tesseract.recognize(frame, "eng", {
          tessedit_pageseg_mode: "6",
          tessedit_char_whitelist: "0123456789Xx- ",
        });
        const isbnText = String(isbnPass?.data?.text || "");
        extractedText = isbnText;
        if (!extractISBNFromRaw(isbnText)) {
          const textPass = await tesseract.recognize(frame, "eng", {
            tessedit_pageseg_mode: "6",
          });
          extractedText = String(textPass?.data?.text || "");
        }
      }

      let isbnFound = extractISBNFromRaw(extractedText);
      stopScanner();

      if (isbnFound) {
        await beepAndVibrate();
        setFormData((prev) => ({ ...prev, isbn: isbnFound }));
        toast.success(`ISBN detectado por OCR: ${isbnFound}`);
        await searchBookByISBN(isbnFound);
        return;
      }

      const query = extractSearchQueryFromText(extractedText);
      if (query) {
        await searchBookByText(query);
        return;
      }

      fallbackToManualIsbn("OCR concluído, mas não encontrei ISBN nem texto útil.");
    } catch {
      fallbackToManualIsbn("Falha no OCR avançado da câmera.");
    } finally {
      setScannerBusy(false);
    }
  };

  const openBackCameraStream = async (): Promise<MediaStream> => {
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: "environment" } }, audio: false },
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: true, audio: false },
    ];

    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("Não foi possível abrir a câmera.");
  };

  const startScanner = async (mode: "barcode" | "cover") => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      fallbackToManualIsbn("Seu navegador não suporta acesso à câmera.");
      return;
    }

    const engine = chooseScannerEngine(mode);
    if (!engine) {
      fallbackToManualIsbn("Seu navegador não suporta detecção por câmera neste fluxo.");
      return;
    }

    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    const TextDetectorCtor = (window as any).TextDetector;

    try {
      setScannerMode(mode);
      setScannerEngine(engine);
      setScannerError("");
      setScannerOpen(true);
      setScannerBusy(true);
      await ensureAudioContextReady();

      const stream = await openBackCameraStream();
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Visualização da câmera indisponível.");
      }
      video.setAttribute("playsinline", "true");
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }
        const onLoadedMetadata = () => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        video.addEventListener("loadedmetadata", onLoadedMetadata);
      });
      await video.play();

      if (engine === "tesseract") {
        setScannerError(
          mode === "barcode"
            ? "Modo compatível ativo. Aponte para o código de barras e toque em Capturar para extrair ISBN."
            : "Pronto para foto da capa. Toque em Capturar para extrair ISBN/título/autor."
        );
        setScannerBusy(false);
        return;
      }

      const detector = engine === "barcode"
        ? new BarcodeDetectorCtor({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          })
        : new TextDetectorCtor();

      if (mode === "barcode" && engine === "text") {
        setScannerError("Detector de barras não disponível. Tentando extrair ISBN por OCR.");
      }

      scannerActiveRef.current = true;

      const scanLoop = async () => {
        if (!scannerActiveRef.current || !videoRef.current) return;
        try {
          const detectedItems = await detector.detect(videoRef.current);
          if (detectedItems?.length) {
            const isbnFound = extractISBNFromDetectedItems(detectedItems);
            if (isbnFound) {
              setFormData((prev) => ({ ...prev, isbn: isbnFound }));
              await beepAndVibrate();
              toast.success(`ISBN detectado: ${isbnFound}`);
              stopScanner();
              await searchBookByISBN(isbnFound);
              return;
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
      fallbackToManualIsbn(getCameraErrorMessage(error));
    } finally {
      setScannerBusy(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (autoScanTriggeredRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const scanParam = params.get("scan");
    if (scanParam !== "barcode" && scanParam !== "cover") return;

    autoScanTriggeredRef.current = true;
    window.history.replaceState({}, "", "/add-book");
    void startScanner(scanParam);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverUrl(URL.createObjectURL(file));
      setCoverCandidates([]);
      setCoverError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.seboId) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const normalizedPrice = parseCurrencyBRLToNumber(formData.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      toast.error("Informe um preço válido");
      return;
    }
    const normalizedQuantity = Number.parseInt(formData.quantity || "1", 10);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
      toast.error("Informe uma quantidade válida (0 ou mais).");
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

      const seboIdToUse = parseInt(formData.seboId);
      if (!Number.isFinite(seboIdToUse)) {
        toast.error("Selecione um sebo válido.");
        setIsUploading(false);
        return;
      }

      await createBookMutation.mutateAsync({
        seboId: seboIdToUse,
        title: formData.title,
        author: formData.author || "Desconhecido",
        isbn: formData.isbn ? normalizeISBN(formData.isbn) : undefined,
        category: formData.category || "Outros",
        description: formData.description || undefined,
        price: normalizedPrice,
        quantity: normalizedQuantity,
        condition: formData.condition,
        availabilityStatus: normalizedQuantity === 0 ? "vendido" : formData.availabilityStatus,
        pages: formData.pages ? parseInt(formData.pages) : undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        coverUrl: finalCoverUrl || undefined,
      });

      trackEvent("book_create_success", { category: formData.category || "Outros" });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          LAST_BOOK_DRAFT_KEY,
          JSON.stringify({
            title: formData.title,
            author: formData.author,
            category: formData.category,
            price: formData.price,
            condition: formData.condition,
            pages: formData.pages,
            year: formData.year,
            description: formData.description,
            quantity: formData.quantity,
            availabilityStatus: formData.availabilityStatus,
          })
        );
        setHasLastDraft(true);
      }
      toast.success("Livro cadastrado com sucesso! 📚");
      setTimeout(() => navigate("/"), 1500);
    } catch (error: any) {
      trackEvent("book_create_error", { message: error?.message ?? "unknown" });
      toast.error(error.message || "Erro ao cadastrar livro");
    } finally {
      setIsUploading(false);
    }
  };

  const applyPricePreset = (value: number) => {
    setFormData((prev) => ({
      ...prev,
      price: value.toFixed(2).replace(".", ","),
    }));
  };

  const loadLastDraft = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LAST_BOOK_DRAFT_KEY);
      if (!raw) {
        toast.error("Nenhum último cadastro encontrado.");
        return;
      }
      const parsed = JSON.parse(raw);
      setFormData((prev) => ({
        ...prev,
        title: parsed.title || "",
        author: parsed.author || "",
        category: parsed.category || "",
        price: parsed.price || "",
        condition: parsed.condition || "Bom estado",
        pages: parsed.pages || "",
        year: parsed.year || "",
        description: parsed.description || "",
        quantity: parsed.quantity || "1",
        availabilityStatus: parsed.availabilityStatus || "ativo",
      }));
      toast.success("Último cadastro carregado.");
    } catch {
      toast.error("Não foi possível carregar o último cadastro.");
    }
  };

  const handlePriceChange = (rawValue: string) => {
    setFormData((prev) => ({
      ...prev,
      price: formatCurrencyFromDigits(rawValue),
    }));
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
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadLastDraft}
              disabled={!hasLastDraft}
              className="px-3 py-2 text-sm rounded border border-[#262969] text-[#262969] hover:bg-[#262969] hover:text-white disabled:opacity-50"
            >
              Reaproveitar último cadastro
            </button>
          </div>
          <div className="grid grid-cols-1 gap-6 mb-8">
            {/* Seção do Sebo */}
            <div className="md:col-span-2">
              <h2 className="font-outfit font-semibold text-lg text-[#262969] mb-4">Informações do Sebo</h2>
              <div className="space-y-4">
                {(sebosLoading || mySebosLoading) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-inter text-sm">Carregando sebos disponíveis...</p>
                  </div>
                )}
                {!availableSebos.length ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-inter text-sm">
                      <strong>Atenção:</strong>{" "}
                      {role === "admin"
                        ? "Não há sebos cadastrados no sistema para vincular este livro."
                        : "Você ainda não possui sebo. Crie um sebo para começar o cadastro."}
                    </p>
                    {role !== "admin" && (
                      <Link href="/sebo/novo">
                        <button className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-inter font-medium py-2 px-4 rounded-lg">
                          Criar Sebo
                        </button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-inter text-sm">
                        Cadastrando livro para:{" "}
                        <strong>
                          {availableSebos.find((sebo: any) => String(sebo.id) === String(formData.seboId))?.name || "-"}
                        </strong>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selecione o sebo *
                      </label>
                      <select
                        required
                        value={formData.seboId}
                        onChange={(e) => setFormData({ ...formData, seboId: e.target.value })}
                        disabled={sebosLoading || mySebosLoading}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                      >
                        <option value="">Selecione um sebo</option>
                        {availableSebos.map((sebo: any) => (
                          <option key={sebo.id} value={String(sebo.id)}>
                            {sebo.name} {(sebo.city || sebo.state) ? `(${sebo.city || "-"} / ${sebo.state || "-"})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
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
                      ref={isbnInputRef}
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
                    onClick={() => void searchBookByISBN()}
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
                    onClick={() => void startScanner("barcode")}
                    disabled={scannerBusy}
                    className="w-full py-3 border-2 border-[#1f7a8c] text-[#1f7a8c] rounded-lg hover:bg-[#1f7a8c] hover:text-white disabled:opacity-50 transition-colors font-bold"
                  >
                    {scannerBusy && scannerMode === "barcode"
                      ? "Abrindo câmera..."
                      : "Escanear código de barras"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startScanner("cover")}
                    disabled={scannerBusy}
                    className="w-full py-3 border-2 border-[#262969] text-[#262969] rounded-lg hover:bg-[#262969] hover:text-white disabled:opacity-50 transition-colors font-bold"
                  >
                    {scannerBusy && scannerMode === "cover"
                      ? "Abrindo câmera..."
                      : "Fotografar capa e extrair dados"}
                  </button>
                </div>
                {scannerOpen && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      Câmera aberta em tamanho otimizado para facilitar o enquadramento.
                    </p>
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
                {bookSuggestions.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm font-semibold mb-2">
                      Opções de livro encontradas ({bookSuggestions.length})
                    </p>
                    <div className="space-y-2 max-h-56 overflow-auto pr-1">
                      {bookSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => applyBookSuggestion(suggestion)}
                          className="w-full text-left p-2 rounded border border-blue-200 bg-white hover:border-blue-400"
                        >
                          <p className="text-sm font-semibold text-[#262969]">{suggestion.title}</p>
                          <p className="text-xs text-gray-600">
                            {suggestion.author || "Autor não informado"}
                            {suggestion.year ? ` • ${suggestion.year}` : ""}
                            {suggestion.isbn ? ` • ISBN ${suggestion.isbn}` : ""}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">Usar este livro</p>
                        </button>
                      ))}
                    </div>
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
                {ALL_BOOK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={formData.price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="0,00"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[10, 20, 30, 50].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyPricePreset(value)}
                    className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    R$ {value},00
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condição</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
              >
                <option value="Novo">Novo</option>
                <option value="Excelente">Excelente</option>
                <option value="Bom estado">Bom estado</option>
                <option value="Usado">Usado</option>
                  <option value="Desgastado">Desgastado</option>
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"].map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => setFormData({ ...formData, condition: condition as any })}
                      className={`px-2 py-1 text-xs rounded border ${
                        formData.condition === condition
                          ? "border-[#da4653] text-[#da4653] bg-red-50"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade disponível</label>
              <input
                type="number"
                min={0}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                placeholder="Ex: 3"
              />
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

                {coverCandidates.length > 1 && (
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <p className="text-sm font-medium text-gray-800 mb-3">Escolha a capa oficial preferida:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {coverCandidates.map((candidate) => {
                        const selected = coverUrl === candidate;
                        return (
                          <button
                            key={candidate}
                            type="button"
                            onClick={() => {
                              setCoverUrl(candidate);
                              setCoverFile(null);
                            }}
                            className={`rounded-lg border-2 overflow-hidden transition ${
                              selected ? "border-[#da4653]" : "border-gray-200 hover:border-gray-400"
                            }`}
                            title={selected ? "Capa selecionada" : "Selecionar capa"}
                          >
                            <img src={candidate} alt="Opção de capa" className="w-full h-28 object-cover" />
                          </button>
                        );
                      })}
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
        {scannerOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm md:max-w-lg">
              <p className="text-white text-sm mb-3">
                {scannerEngine === "text" || scannerEngine === "tesseract"
                  ? "Aponte para capa/lombada ou área com texto/ISBN."
                  : "Aponte para o código de barras do livro."}
              </p>
              <video
                ref={videoRef}
                className="w-full h-[40vh] md:h-[48vh] rounded-xl bg-black border border-white/20 object-cover"
                autoPlay
                muted
                playsInline
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-4 py-2 text-sm rounded border border-white/40 text-white hover:bg-white/10"
                >
                  Fechar câmera
                </button>
                {scannerEngine === "tesseract" && (
                  <button
                    type="button"
                    onClick={() => void runTesseractOcrFromCamera()}
                    disabled={scannerBusy}
                    className="px-4 py-2 text-sm rounded border border-[#8ea4ff] text-[#dce3ff] hover:bg-[#262969] disabled:opacity-50"
                  >
                    {scannerBusy ? "Processando foto..." : "Capturar foto e extrair dados"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
