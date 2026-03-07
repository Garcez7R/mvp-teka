import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, Upload, Edit2, Trash2, Search as SearchIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

interface EditingBook {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  price: number;
  quantity: number;
  availabilityStatus?: "ativo" | "reservado" | "vendido";
  isVisible?: boolean;
  coverUrl?: string;
  newCoverFile?: File;
}

type StatusHistoryEntry = {
  status: "ativo" | "reservado" | "vendido";
  at: number;
  reason?: string;
};

export default function ManageBooks() {
  const { isAuthenticated, role } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBook, setEditingBook] = useState<EditingBook | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingCoverOptions, setEditingCoverOptions] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusHistoryByBook, setStatusHistoryByBook] = useState<Record<number, StatusHistoryEntry[]>>({});
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [showCharts, setShowCharts] = useState(false);

  const { data: mySebo } = trpc.sebos.getMySebo.useQuery(undefined, {
    enabled: isAuthenticated
  });
  const { data: myBooks = [] } = trpc.books.listBySebo.useQuery(
    mySebo?.id || 0,
    { enabled: !!mySebo }
  );
  const { data: metrics } = trpc.books.sellerMetrics.useQuery(
    { seboId: mySebo?.id },
    { enabled: !!mySebo }
  );

  const statusHistoryStorageKey = useMemo(
    () => (mySebo?.id ? `teka_status_history_${mySebo.id}` : "teka_status_history_unknown"),
    [mySebo?.id]
  );
  const statusChartData = useMemo(
    () => [
      { label: "Ativos", value: metrics?.activeBooks ?? 0, color: "#059669" },
      { label: "Reservados", value: metrics?.reservedBooks ?? 0, color: "#d97706" },
      { label: "Vendidos", value: metrics?.soldBooks ?? 0, color: "#334155" },
    ],
    [metrics]
  );
  const topFavoritesChartData = useMemo(
    () =>
      (metrics?.topBooks ?? []).slice(0, 5).map((item: any) => ({
        label: String(item.title || "Livro").slice(0, 18),
        value: Number(item.favorites ?? 0),
      })),
    [metrics]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(statusHistoryStorageKey);
      if (!raw) {
        setStatusHistoryByBook({});
        return;
      }
      const parsed = JSON.parse(raw);
      setStatusHistoryByBook(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setStatusHistoryByBook({});
    }
  }, [statusHistoryStorageKey]);

  useEffect(() => {
    localStorage.setItem(statusHistoryStorageKey, JSON.stringify(statusHistoryByBook));
  }, [statusHistoryByBook, statusHistoryStorageKey]);

  const updateBookMutation = trpc.books.update.useMutation({
    onSuccess: async () => {
      await utils.books.listBySebo.invalidate();
    },
  });
  const deleteBookMutation = trpc.books.delete.useMutation({
    onSuccess: async () => {
      await utils.books.listBySebo.invalidate();
    },
  });
  const cloneBookMutation = trpc.books.clone.useMutation({
    onSuccess: async () => {
      await utils.books.listBySebo.invalidate();
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-outfit font-bold text-2xl text-[#262969] mb-4">
              Acesso Restrito
            </h1>
            <p className="text-gray-600 mb-6">Você precisa fazer login.</p>
            <Link
              href="/login"
              className="inline-block bg-[#da4653] text-white font-outfit font-bold py-2 px-6 rounded-lg"
            >
              Fazer Login
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (role !== "livreiro" && role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12 flex items-center justify-center">
          <p className="text-gray-700">Apenas livreiros e admins podem gerenciar livros.</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!mySebo) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12 text-center">
          <p className="text-gray-600 mb-6">Você precisa criar um sebo primeiro.</p>
          <Link href="/sebo/novo">
            <button className="bg-[#da4653] text-white font-outfit font-bold py-2 px-6 rounded-lg">
              Criar Sebo
            </button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const filteredBooks = myBooks.filter(
    (book: any) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );
  const selectedBooksCount = selectedBookIds.length;
  const allFilteredSelected =
    filteredBooks.length > 0 &&
    filteredBooks.every((book: any) => selectedBookIds.includes(Number(book.id)));
  const formatChartNumber = (value: unknown) => Number(value || 0).toLocaleString("pt-BR");

  const handleEdit = (book: typeof myBooks[0]) => {
    setEditingId(book.id);
    setEditingBook({
      id: book.id,
      title: book.title,
      author: book.author || undefined,
      isbn: book.isbn || undefined,
      price: Number(book.price),
      quantity: Number(book.quantity ?? 1),
      availabilityStatus: book.availabilityStatus || "ativo",
      isVisible: book.isVisible ?? true,
      coverUrl: book.coverUrl || undefined,
    });
    setEditingCoverOptions(book.coverUrl ? [book.coverUrl] : []);
  };

  const dedupeCoverUrls = (values: Array<string | null | undefined>) => {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const value of values) {
      if (!value) continue;
      const safeValue = String(value).replace("http://", "https://");
      if (seen.has(safeValue)) continue;
      seen.add(safeValue);
      normalized.push(safeValue);
    }
    return normalized;
  };

  const fetchCoverOptionsByIsbn = async (isbnRaw?: string) => {
    const isbn = String(isbnRaw || "").replace(/[^0-9Xx]/g, "").toUpperCase();
    if (!isbn) {
      toast.error("Informe um ISBN para buscar capas.");
      return;
    }
    try {
      const options: Array<string | null | undefined> = [
        `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
        `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
      ];
      const gb = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=5`
      );
      if (gb.ok) {
        const data = await gb.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        for (const item of items) {
          const links = item?.volumeInfo?.imageLinks;
          options.push(
            links?.extraLarge,
            links?.large,
            links?.medium,
            links?.small,
            links?.thumbnail,
            links?.smallThumbnail
          );
        }
      }
      const unique = dedupeCoverUrls(options);
      if (!unique.length) {
        toast.error("Nenhuma capa encontrada para este ISBN.");
        return;
      }
      setEditingCoverOptions(unique);
      setEditingBook((prev) => (prev ? { ...prev, coverUrl: unique[0] } : prev));
      toast.success(`Encontradas ${unique.length} opção(ões) de capa.`);
    } catch {
      toast.error("Falha ao buscar opções de capa.");
    }
  };

  const fetchCoverOptionsByText = async (title?: string, author?: string) => {
    const query = [title, author].filter(Boolean).join(" ").trim();
    if (!query) {
      toast.error("Preencha título/autor para buscar capas.");
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
      const unique = dedupeCoverUrls(
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
      if (!unique.length) {
        toast.error("Nenhuma capa encontrada por título/autor.");
        return;
      }
      setEditingCoverOptions(unique);
      setEditingBook((prev) => (prev ? { ...prev, coverUrl: unique[0] } : prev));
      toast.success(`Encontradas ${unique.length} opção(ões) de capa.`);
    } catch {
      toast.error("Falha ao buscar capas por título/autor.");
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBook) {
      setEditingBook({
        ...editingBook,
        newCoverFile: file,
        coverUrl: URL.createObjectURL(file),
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBook) return;

    try {
      setIsUploading(true);
      let coverUrl = editingBook.coverUrl;
      const normalizedQuantity = Number.isFinite(editingBook.quantity)
        ? Math.max(0, Math.trunc(editingBook.quantity))
        : 0;

      // Upload new cover if file selected
      if (editingBook.newCoverFile) {
        toast.error("Upload manual de capa desativado na estratégia Cloudflare-only.");
        setIsUploading(false);
        return;
      }

      // build payload separately so we can conditionally include optional fields
      const payload: any = {
        id: editingBook.id,
        title: editingBook.title,
        author: editingBook.author || undefined,
        price: editingBook.price,
        quantity: normalizedQuantity,
        availabilityStatus: editingBook.availabilityStatus || "ativo",
        isVisible: editingBook.isVisible ?? true,
        coverUrl: coverUrl || undefined,
      };
      if (editingBook.isbn) {
        payload.isbn = editingBook.isbn;
      }

      await updateBookMutation.mutateAsync(payload);

      if (editingBook.availabilityStatus) {
        const nextEntry: StatusHistoryEntry = {
          status: editingBook.availabilityStatus,
          at: Date.now(),
          reason: "Atualização manual no painel",
        };
        setStatusHistoryByBook((prev) => ({
          ...prev,
          [editingBook.id]: [nextEntry, ...(prev[editingBook.id] || [])].slice(0, 10),
        }));
      }

      toast.success("Livro atualizado com sucesso!");
      setEditingId(null);
      setEditingBook(null);
      setEditingCoverOptions([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar livro");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (bookId: number, title: string) => {
    if (!confirm(`Deseja excluir "${title}"? Esta ação não pode ser desfeita.`)) return;

    try {
      setDeletingId(bookId);
      await deleteBookMutation.mutateAsync(bookId);
      toast.success("Livro deletado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar livro");
    } finally {
      setDeletingId(null);
    }
  };

  const updateStatusQuick = async (
    bookId: number,
    availabilityStatus: "ativo" | "reservado" | "vendido"
  ) => {
    try {
      await updateBookMutation.mutateAsync({ id: bookId, availabilityStatus });
      const nextEntry: StatusHistoryEntry = {
        status: availabilityStatus,
        at: Date.now(),
        reason: "Ação rápida no card",
      };
      setStatusHistoryByBook((prev) => ({
        ...prev,
        [bookId]: [nextEntry, ...(prev[bookId] || [])].slice(0, 10),
      }));
      toast.success("Status atualizado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const toggleSelectBook = (bookId: number, selected: boolean) => {
    setSelectedBookIds((prev) => {
      if (selected) {
        if (prev.includes(bookId)) return prev;
        return [...prev, bookId];
      }
      return prev.filter((id) => id !== bookId);
    });
  };

  const toggleSelectAllFiltered = (selected: boolean) => {
    if (selected) {
      const allFilteredIds = filteredBooks.map((book: any) => Number(book.id));
      setSelectedBookIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
      return;
    }
    const filteredSet = new Set(filteredBooks.map((book: any) => Number(book.id)));
    setSelectedBookIds((prev) => prev.filter((id) => !filteredSet.has(id)));
  };

  const bulkUpdateStatus = async (status: "ativo" | "reservado" | "vendido") => {
    if (selectedBookIds.length === 0) {
      toast.error("Selecione ao menos um livro para ação em lote.");
      return;
    }
    try {
      await Promise.all(
        selectedBookIds.map((id) =>
          updateBookMutation.mutateAsync({ id, availabilityStatus: status })
        )
      );
      const now = Date.now();
      setStatusHistoryByBook((prev) => {
        const next = { ...prev };
        for (const id of selectedBookIds) {
          const entry: StatusHistoryEntry = {
            status,
            at: now,
            reason: "Ação em lote no painel",
          };
          next[id] = [entry, ...(next[id] || [])].slice(0, 10);
        }
        return next;
      });
      toast.success(`Status atualizado para ${selectedBookIds.length} livro(s).`);
      setSelectedBookIds([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao aplicar ação em lote.");
    }
  };

  const bulkAdjustQuantity = async (delta: number) => {
    if (selectedBookIds.length === 0) {
      toast.error("Selecione ao menos um livro para ação em lote.");
      return;
    }
    const selectedBooks = myBooks.filter((book: any) => selectedBookIds.includes(Number(book.id)));
    try {
      await Promise.all(
        selectedBooks.map((book: any) => {
          const current = Number(book.quantity ?? 1);
          const next = Math.max(0, current + delta);
          return updateBookMutation.mutateAsync({
            id: Number(book.id),
            quantity: next,
            ...(next === 0 ? { availabilityStatus: "vendido" as const } : {}),
          });
        })
      );
      toast.success(`Quantidade ajustada para ${selectedBooks.length} livro(s).`);
      setSelectedBookIds([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao ajustar quantidade em lote.");
    }
  };

  const handleCloneBook = async (book: any) => {
    const nextCondition = window.prompt(
      'Condição do novo item (Novo, Excelente, Bom estado, Usado, Desgastado)',
      String(book.condition || "Bom estado")
    );
    if (!nextCondition) return;

    const allowed = new Set(["Novo", "Excelente", "Bom estado", "Usado", "Desgastado"]);
    if (!allowed.has(nextCondition)) {
      toast.error("Condição inválida para duplicação.");
      return;
    }

    const qtyInput = window.prompt("Quantidade do novo item", String(book.quantity ?? 1));
    if (qtyInput === null) return;
    const quantity = Number.parseInt(qtyInput, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Quantidade inválida.");
      return;
    }

    try {
      await cloneBookMutation.mutateAsync({
        id: Number(book.id),
        condition: nextCondition as "Novo" | "Excelente" | "Bom estado" | "Usado" | "Desgastado",
        quantity,
      });
      toast.success("Livro duplicado como novo item.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao duplicar livro");
    }
  };

  const adjustQuantityQuick = async (book: any, delta: number) => {
    const currentQuantity = Number(book.quantity ?? 1);
    const nextQuantity = Math.max(0, currentQuantity + delta);
    try {
      await updateBookMutation.mutateAsync({
        id: book.id,
        quantity: nextQuantity,
        ...(nextQuantity === 0 ? { availabilityStatus: "vendido" as const } : {}),
      });
      toast.success(nextQuantity === 0 ? "Estoque zerado. Livro marcado como vendido." : "Quantidade atualizada");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar quantidade");
    }
  };

  const toggleVisibilityQuick = async (book: any) => {
    const nextVisibility = !(book.isVisible ?? true);
    try {
      await updateBookMutation.mutateAsync({
        id: Number(book.id),
        isVisible: nextVisibility,
      });
      toast.success(
        nextVisibility
          ? "Livro visível no catálogo."
          : "Livro ocultado do catálogo de compradores."
      );
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar visibilidade");
    }
  };

  const handleExportCsv = () => {
    const header = [
      "id",
      "titulo",
      "autor",
      "isbn",
      "categoria",
      "preco",
      "condicao",
      "status",
      "ultima_atualizacao",
    ];
    const rows = filteredBooks.map((book: any) => [
      book.id,
      book.title || "",
      book.author || "",
      book.isbn || "",
      book.category || "",
      Number(book.price).toFixed(2),
      book.condition || "",
      book.availabilityStatus || "ativo",
      new Date(Number(book.updatedAt || Date.now())).toLocaleString("pt-BR"),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teka-catalogo-${mySebo?.name?.replace(/\s+/g, "-").toLowerCase() || "sebo"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-12">
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-600 hover:text-[#262969] transition-colors font-inter text-sm font-medium mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao catálogo
          </button>
        </Link>
        <h1 className="font-outfit font-bold text-3xl text-[#262969] mb-2">Meu Catálogo</h1>
        <p className="text-gray-600 mb-8">{mySebo.name}</p>
        <section className="mb-8 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCharts((prev) => !prev)}
              className="px-3 py-2 text-sm rounded border border-[#262969] text-[#262969] hover:bg-[#262969] hover:text-white"
            >
              {showCharts ? "Ocultar gráficos" : "Exibir gráficos"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-xs text-gray-500">Livros</p>
              <p className="text-xl font-bold text-[#262969]">{metrics?.totalBooks ?? myBooks.length}</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-xs text-gray-500">Ativos</p>
              <p className="text-xl font-bold text-emerald-700">{metrics?.activeBooks ?? 0}</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-xs text-gray-500">Reservados</p>
              <p className="text-xl font-bold text-amber-600">{metrics?.reservedBooks ?? 0}</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-xs text-gray-500">Vendidos</p>
              <p className="text-xl font-bold text-gray-800">{metrics?.soldBooks ?? 0}</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-xs text-gray-500">Favoritos</p>
              <p className="text-xl font-bold text-[#da4653]">{metrics?.totalFavorites ?? 0}</p>
            </div>
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-xs text-gray-500">Interesses</p>
              <p className="text-xl font-bold text-[#262969]">{metrics?.totalInterests ?? 0}</p>
            </div>
          </div>
          {showCharts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-white">
                <h3 className="font-semibold text-[#262969] mb-3">Distribuição por status</h3>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                        {statusChartData.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatChartNumber(value), "Livros"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-white">
                <h3 className="font-semibold text-[#262969] mb-3">Top livros por favoritos</h3>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topFavoritesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value) => [formatChartNumber(value), "Favoritos"]} />
                      <Bar dataKey="value" fill="#da4653" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : null}
        </section>
        {metrics?.topBooks?.length ? (
          <div className="mb-8 p-4 border rounded-lg bg-white">
            <h3 className="font-semibold text-[#262969] mb-2">Top livros por favoritos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {metrics.topBooks.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <span className="truncate pr-3">{item.title}</span>
                  <span className="font-semibold text-[#da4653]">{item.favorites}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-gray-600 text-lg">
              Total de livros: <span className="font-bold text-[#262969]">{myBooks.length}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              className="border border-[#262969] text-[#262969] hover:bg-[#262969] hover:text-white font-inter font-medium py-2 px-4 rounded-lg"
            >
              Exportar CSV
            </button>
            <Link href="/add-book">
              <button className="bg-[#da4653] hover:bg-[#c23a45] text-white font-inter font-medium py-2 px-6 rounded-lg">
                + Novo Livro
              </button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
            />
          </div>
        </div>
        {filteredBooks.length > 0 && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                />
                Selecionar todos visíveis
              </label>
              <span className="text-sm text-gray-600">Selecionados: {selectedBooksCount}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void bulkUpdateStatus("ativo")}
                className="px-3 py-2 text-sm rounded border border-emerald-600 text-emerald-700"
              >
                Em lote: marcar ativos
              </button>
              <button
                type="button"
                onClick={() => void bulkUpdateStatus("reservado")}
                className="px-3 py-2 text-sm rounded border border-amber-500 text-amber-700"
              >
                Em lote: marcar reservados
              </button>
              <button
                type="button"
                onClick={() => void bulkUpdateStatus("vendido")}
                className="px-3 py-2 text-sm rounded border border-gray-700 text-gray-700"
              >
                Em lote: marcar vendidos
              </button>
              <button
                type="button"
                onClick={() => void bulkAdjustQuantity(1)}
                className="px-3 py-2 text-sm rounded border border-[#262969] text-[#262969]"
              >
                Em lote: +1 unidade
              </button>
              <button
                type="button"
                onClick={() => void bulkAdjustQuantity(-1)}
                className="px-3 py-2 text-sm rounded border border-[#262969] text-[#262969]"
              >
                Em lote: -1 unidade
              </button>
            </div>
          </div>
        )}

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredBooks.map((book: any) => (
              <div
                key={book.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Cover Preview */}
                <div className="bg-gray-100 p-4">
                  <div className="rounded-lg overflow-hidden border border-gray-200 aspect-[2/3] w-1/3 mx-auto bg-white">
                    <BookCover
                      isbn={book.isbn ?? undefined}
                      title={book.title}
                      author={book.author ?? undefined}
                      coverUrl={book.coverUrl ?? undefined}
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <div className="mb-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedBookIds.includes(Number(book.id))}
                        onChange={(e) => toggleSelectBook(Number(book.id), e.target.checked)}
                      />
                      Selecionar para ações em lote
                    </label>
                  </div>
                  {editingId === book.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editingBook?.title || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />

                      <input
                        type="text"
                        placeholder="Autor"
                        value={editingBook?.author || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            author: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Preço"
                        step="0.01"
                        value={editingBook?.price?.toString() || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            price: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Quantidade"
                        value={String(editingBook?.quantity ?? 1)}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            quantity: Number.parseInt(e.target.value || "0", 10),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />
                      <select
                        value={editingBook?.availabilityStatus || "ativo"}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            availabilityStatus: e.target.value as "ativo" | "reservado" | "vendido",
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      >
                        <option value="ativo">Disponivel</option>
                        <option value="reservado">Reservado</option>
                        <option value="vendido">Vendido</option>
                      </select>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editingBook?.isVisible ?? true}
                          onChange={(e) =>
                            setEditingBook({
                              ...editingBook!,
                              isVisible: e.target.checked,
                            })
                          }
                        />
                        Visível para compradores
                      </label>
                      <input
                        type="text"
                        placeholder="URL da capa (https://...)"
                        value={editingBook?.coverUrl || ""}
                        onChange={(e) =>
                          setEditingBook({
                            ...editingBook!,
                            coverUrl: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void fetchCoverOptionsByIsbn(editingBook?.isbn)}
                        className="w-full px-3 py-2 border border-[#262969] text-[#262969] rounded hover:bg-[#262969] hover:text-white text-sm"
                      >
                        Buscar opções de capa por ISBN
                      </button>
                      <button
                        type="button"
                        onClick={() => void fetchCoverOptionsByText(editingBook?.title, editingBook?.author)}
                        className="w-full px-3 py-2 border border-[#262969] text-[#262969] rounded hover:bg-[#262969] hover:text-white text-sm"
                      >
                        Buscar opções de capa por título/autor
                      </button>
                      {editingCoverOptions.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {editingCoverOptions.slice(0, 6).map((coverOption) => (
                            <button
                              key={coverOption}
                              type="button"
                              onClick={() =>
                                setEditingBook({
                                  ...editingBook!,
                                  coverUrl: coverOption,
                                })
                              }
                              className={`rounded border-2 overflow-hidden ${
                                editingBook?.coverUrl === coverOption
                                  ? "border-[#da4653]"
                                  : "border-gray-200 hover:border-gray-400"
                              }`}
                            >
                              <img src={coverOption} alt="Opção de capa" className="w-full h-20 object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Cover Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Atualizar Capa
                        </label>
                        <label className="block border-2 border-dashed border-gray-300 rounded p-3 text-center cursor-pointer hover:border-[#da4653]">
                          <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-600">Clique para atualizar</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Edit Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isUploading}
                          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 rounded font-medium text-sm"
                        >
                          {isUploading ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingBook(null);
                          }}
                          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded font-medium text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <h3 className="font-outfit font-semibold text-lg text-[#262969] mb-1">
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-sm text-gray-600 mb-2">por {book.author}</p>
                      )}
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-bold text-[#da4653]">
                          R$ {Number(book.price).toFixed(2)}
                        </span>
                        <div className="flex gap-2">
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            {book.condition}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded text-white ${
                              book.availabilityStatus === "vendido"
                                ? "bg-gray-800"
                                : book.availabilityStatus === "reservado"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                          >
                            {book.availabilityStatus === "vendido"
                              ? "Vendido"
                              : book.availabilityStatus === "reservado"
                              ? "Reservado"
                              : "Disponivel"}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              (book.isVisible ?? true)
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {(book.isVisible ?? true) ? "Visível" : "Oculto"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm text-gray-700">
                          Unidades disponíveis: <span className="font-semibold">{Number(book.quantity ?? 1)}</span>
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void adjustQuantityQuick(book, -1)}
                            className="px-2 py-1 text-xs rounded border border-gray-400 text-gray-700"
                          >
                            -1 un.
                          </button>
                          <button
                            onClick={() => void adjustQuantityQuick(book, 1)}
                            className="px-2 py-1 text-xs rounded border border-gray-400 text-gray-700"
                          >
                            +1 un.
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => void updateStatusQuick(book.id, "ativo")}
                          className="px-2 py-1 text-xs rounded border border-emerald-600 text-emerald-700"
                        >
                          Ativo
                        </button>
                        <button
                          onClick={() => void updateStatusQuick(book.id, "reservado")}
                          className="px-2 py-1 text-xs rounded border border-amber-500 text-amber-700"
                        >
                          Reservar
                        </button>
                        <button
                          onClick={() => void updateStatusQuick(book.id, "vendido")}
                          className="px-2 py-1 text-xs rounded border border-gray-700 text-gray-700"
                        >
                          Marcar vendido
                        </button>
                        <button
                          onClick={() => void toggleVisibilityQuick(book)}
                          className="px-2 py-1 text-xs rounded border border-blue-700 text-blue-700"
                        >
                          {(book.isVisible ?? true) ? "Ocultar" : "Exibir"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Última atualização: {new Date(Number(book.updatedAt || Date.now())).toLocaleString("pt-BR")}
                      </p>
                      {statusHistoryByBook[book.id]?.length ? (
                        <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Histórico de status</p>
                          {statusHistoryByBook[book.id].slice(0, 3).map((entry, idx) => (
                            <p key={`${book.id}-${idx}-${entry.at}`} className="text-xs text-gray-600">
                              {new Date(entry.at).toLocaleString("pt-BR")} • {entry.status}
                              {entry.reason ? ` • ${entry.reason}` : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(book)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-medium text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => void handleCloneBook(book)}
                          className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded font-medium text-sm"
                        >
                          Duplicar
                        </button>
                        <button
                          onClick={() => handleDelete(book.id, book.title)}
                          disabled={deletingId === book.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded font-medium text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingId === book.id ? "Deletando..." : "Deletar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nenhum livro cadastrado ainda.</p>
            <Link href="/add-book">
              <button className="bg-[#da4653] text-white font-outfit font-bold py-2 px-6 rounded-lg">
                Cadastrar Primeiro Livro
              </button>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
