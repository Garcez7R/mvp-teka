import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { type ChangeEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import BookCover from "@/components/BookCover";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/datetime";
import { useTheme } from "@/contexts/ThemeContext";
import { Upload } from "lucide-react";

type AdminTab = "users" | "sebos" | "books";

interface EditingAdminBook {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  description?: string;
  price: number;
  condition?: "Novo" | "Excelente" | "Bom estado" | "Usado" | "Desgastado";
  pages?: number;
  year?: number;
  quantity: number;
  availabilityStatus?: "ativo" | "reservado" | "vendido";
  isVisible?: boolean;
  coverUrl?: string;
}

export default function Admin() {
  const { theme } = useTheme();
  const {
    isAuthenticated,
    isServerAuthenticated,
    hasSessionToken,
    role,
    loading,
    refresh,
  } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<AdminTab>("users");
  const [selectedSeboId, setSelectedSeboId] = useState<number | null>(null);
  const [booksPage, setBooksPage] = useState(0);
  const [userFilter, setUserFilter] = useState("");
  const [booksFilter, setBooksFilter] = useState("");
  const [booksCoverFilter, setBooksCoverFilter] = useState<"all" | "with-cover" | "no-cover">("all");
  const [bookCoverOptions, setBookCoverOptions] = useState<Record<number, string[]>>({});
  const [coverLoadingId, setCoverLoadingId] = useState<number | null>(null);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [editingBook, setEditingBook] = useState<EditingAdminBook | null>(null);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [showFullAudit, setShowFullAudit] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const BOOKS_PAGE_SIZE = 50;
  const canRunAdminQueries =
    isAuthenticated &&
    role === "admin" &&
    isServerAuthenticated;

  const usersQuery = trpc.users.adminList.useQuery(undefined, {
    enabled: canRunAdminQueries,
  });
  const sebosQuery = trpc.sebos.list.useQuery(undefined, {
    enabled: canRunAdminQueries,
  });
  const booksQuery = trpc.books.list.useQuery(
    {
      limit: BOOKS_PAGE_SIZE,
      offset: booksPage * BOOKS_PAGE_SIZE,
      seboId: selectedSeboId ?? undefined,
    },
    {
      enabled: canRunAdminQueries && tab === "books",
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );
  const adminMetricsQuery = trpc.users.adminMetrics.useQuery(undefined, {
    enabled: canRunAdminQueries,
    refetchOnWindowFocus: false,
  });
  const seboReviewsQuery = trpc.sebos.adminListReviews.useQuery(
    { limit: 50 },
    {
      enabled: canRunAdminQueries && tab === "sebos",
      refetchOnWindowFocus: false,
    }
  );
  const users = usersQuery.data ?? [];
  const sebos = sebosQuery.data ?? [];
  const books = booksQuery.data ?? [];
  const adminMetrics = adminMetricsQuery.data;
  const roleChartData = useMemo(
    () => [
      { label: "Compradores", value: adminMetrics?.users.buyers ?? 0 },
      { label: "Livreiros", value: adminMetrics?.users.sellers ?? 0 },
      { label: "Admins", value: adminMetrics?.users.admins ?? 0 },
    ],
    [adminMetrics]
  );
  const booksStatusChartData = useMemo(
    () => [
      { label: "Ativos", value: adminMetrics?.books.active ?? 0, color: "#059669" },
      { label: "Reservados", value: adminMetrics?.books.reserved ?? 0, color: "#d97706" },
      { label: "Vendidos", value: adminMetrics?.books.sold ?? 0, color: "#334155" },
    ],
    [adminMetrics]
  );
  const formatChartNumber = (value: unknown) => Number(value || 0).toLocaleString("pt-BR");
  const chartAxisColor = theme === "dark" ? "#e5e7eb" : "#374151";
  const chartGridColor = theme === "dark" ? "#334155" : "#d1d5db";
  const chartTooltipContentStyle = {
    backgroundColor: theme === "dark" ? "#111827" : "#ffffff",
    border: `1px solid ${theme === "dark" ? "#374151" : "#d1d5db"}`,
    borderRadius: "8px",
    color: theme === "dark" ? "#f3f4f6" : "#111827",
  } as const;
  const chartTooltipLabelStyle = {
    color: theme === "dark" ? "#f3f4f6" : "#111827",
  } as const;
  const chartTooltipItemStyle = {
    color: theme === "dark" ? "#f3f4f6" : "#111827",
  } as const;
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

  const fetchCoverOptionsByIsbn = async (book: any) => {
    const isbn = String(book?.isbn || "").replace(/[^0-9Xx]/g, "").toUpperCase();
    if (!isbn) {
      toast.error("Livro sem ISBN para buscar capas.");
      return;
    }
    try {
      setCoverLoadingId(Number(book.id));
      const options: Array<string | null | undefined> = [
        `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
        `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
      ];
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=6`
      );
      if (response.ok) {
        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
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
        toast.error("Nenhuma capa encontrada por ISBN.");
        return;
      }
      setBookCoverOptions((prev) => ({ ...prev, [Number(book.id)]: unique }));
      toast.success(`Encontradas ${unique.length} opção(ões) de capa.`);
    } catch {
      toast.error("Falha ao buscar capas por ISBN.");
    } finally {
      setCoverLoadingId(null);
    }
  };

  const fetchCoverOptionsByText = async (book: any) => {
    const query = [book?.title, book?.author].filter(Boolean).join(" ").trim();
    if (!query) {
      toast.error("Livro sem título/autor para buscar capas.");
      return;
    }
    try {
      setCoverLoadingId(Number(book.id));
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
      setBookCoverOptions((prev) => ({ ...prev, [Number(book.id)]: unique }));
      toast.success(`Encontradas ${unique.length} opção(ões) de capa.`);
    } catch {
      toast.error("Falha ao buscar capas por título/autor.");
    } finally {
      setCoverLoadingId(null);
    }
  };

  const adminCreateUserMutation = trpc.users.adminCreate.useMutation({
    onSuccess: async () => {
      await utils.users.adminList.invalidate();
      toast.success("Usuário criado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao criar usuário."),
  });
  const adminUpdateUserMutation = trpc.users.adminUpdate.useMutation({
    onSuccess: async () => {
      await utils.users.adminList.invalidate();
      toast.success("Usuário atualizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar usuário."),
  });
  const adminDeleteUserMutation = trpc.users.adminDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.users.adminList.invalidate(), utils.sebos.list.invalidate(), utils.books.list.invalidate()]);
      toast.success("Usuário removido.");
    },
    onError: (error) => toast.error(error.message || "Erro ao remover usuário."),
  });

  const adminCreateSeboMutation = trpc.sebos.adminCreate.useMutation({
    onSuccess: async () => {
      await utils.sebos.list.invalidate();
      toast.success("Sebo criado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao criar sebo."),
  });
  const adminUpdateSeboMutation = trpc.sebos.adminUpdate.useMutation({
    onSuccess: async () => {
      await utils.sebos.list.invalidate();
      toast.success("Sebo atualizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar sebo."),
  });
  const adminDeleteSeboMutation = trpc.sebos.adminDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.sebos.list.invalidate(), utils.books.list.invalidate()]);
      toast.success("Sebo removido.");
    },
    onError: (error) => toast.error(error.message || "Erro ao remover sebo."),
  });
  const adminSetSeboPlanMutation = trpc.sebos.adminSetPlan.useMutation({
    onSuccess: async () => {
      await utils.sebos.list.invalidate();
      toast.success("Plano do sebo atualizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar plano do sebo."),
  });
  const adminModerateReviewMutation = trpc.sebos.adminModerateReview.useMutation({
    onSuccess: async () => {
      await seboReviewsQuery.refetch();
      await utils.sebos.list.invalidate();
      toast.success("Visibilidade da avaliação atualizada.");
    },
    onError: (error) => toast.error(error.message || "Erro ao moderar avaliação."),
  });

  const adminUpdateBookMutation = trpc.books.update.useMutation({
    onSuccess: async () => {
      await utils.books.list.invalidate();
      toast.success("Livro atualizado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar livro."),
  });
  const adminDeleteBookMutation = trpc.books.delete.useMutation({
    onSuccess: async () => {
      await utils.books.list.invalidate();
      toast.success("Livro removido.");
    },
    onError: (error) => toast.error(error.message || "Erro ao remover livro."),
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "comprador" as "admin" | "livreiro" | "comprador" | "user",
  });
  const [newSebo, setNewSebo] = useState({
    userId: "",
    name: "",
    whatsapp: "",
    city: "",
    state: "",
  });

  const usersById = useMemo(
    () => new Map(users.map((user: any) => [Number(user.id), user])),
    [users]
  );
  const seboCountByUserId = useMemo(() => {
    const counters = new Map<number, number>();
    for (const sebo of sebos as any[]) {
      const userId = Number(sebo.userId);
      counters.set(userId, (counters.get(userId) || 0) + 1);
    }
    return counters;
  }, [sebos]);
  const normalizedUserFilter = userFilter.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedUserFilter) return users;
    return users.filter((user: any) => {
      const name = String(user.name ?? "").toLowerCase();
      const email = String(user.email ?? "").toLowerCase();
      return (
        name.includes(normalizedUserFilter) ||
        email.includes(normalizedUserFilter) ||
        String(user.id).includes(normalizedUserFilter)
      );
    });
  }, [normalizedUserFilter, users]);
  const activeError =
    tab === "users"
      ? usersQuery.error
      : tab === "sebos"
      ? sebosQuery.error
      : booksQuery.error;
  const normalizedBooksFilter = booksFilter.trim().toLowerCase();
  const filteredBooks = useMemo(() => {
    return books.filter((book: any) => {
      const hasCover = Boolean(String(book.coverUrl ?? "").trim());
      if (booksCoverFilter === "no-cover" && hasCover) return false;
      if (booksCoverFilter === "with-cover" && !hasCover) return false;
      const id = String(book.id ?? "");
      const title = String(book.title ?? "").toLowerCase();
      const author = String(book.author ?? "").toLowerCase();
      const isbn = String(book.isbn ?? "").toLowerCase();
      const seboName = String(book.sebo?.name ?? "").toLowerCase();
      if (!normalizedBooksFilter) return true;
      return (
        id.includes(normalizedBooksFilter) ||
        title.includes(normalizedBooksFilter) ||
        author.includes(normalizedBooksFilter) ||
        isbn.includes(normalizedBooksFilter) ||
        seboName.includes(normalizedBooksFilter)
      );
    });
  }, [books, booksCoverFilter, normalizedBooksFilter]);

  const startEditBook = (book: any) => {
    setEditingBookId(Number(book.id));
    setEditingBook({
      id: Number(book.id),
      title: String(book.title || ""),
      author: book.author || undefined,
      isbn: book.isbn || undefined,
      category: book.category || undefined,
      description: book.description || undefined,
      price: Number(book.price ?? 0),
      condition: (book.condition || "Bom estado") as EditingAdminBook["condition"],
      pages: Number.isFinite(Number(book.pages)) ? Number(book.pages) : undefined,
      year: Number.isFinite(Number(book.year)) ? Number(book.year) : undefined,
      quantity: Number(book.quantity ?? 1),
      availabilityStatus: (book.availabilityStatus || "ativo") as EditingAdminBook["availabilityStatus"],
      isVisible: book.isVisible ?? true,
      coverUrl: book.coverUrl || undefined,
    });
    if (book.coverUrl) {
      setBookCoverOptions((prev) => ({ ...prev, [Number(book.id)]: [String(book.coverUrl)] }));
    }
  };

  const cancelEditBook = () => {
    setEditingBookId(null);
    setEditingBook(null);
  };

  const saveEditBook = async () => {
    if (!editingBook) return;
    if (!editingBook.title.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }
    if (!Number.isFinite(editingBook.price) || editingBook.price <= 0) {
      toast.error("Preço inválido.");
      return;
    }
    if (!Number.isFinite(editingBook.quantity) || editingBook.quantity < 0) {
      toast.error("Quantidade inválida.");
      return;
    }
    try {
      setIsSavingBook(true);
      await adminUpdateBookMutation.mutateAsync({
        id: editingBook.id,
        title: editingBook.title.trim(),
        author: editingBook.author?.trim() || undefined,
        isbn: editingBook.isbn?.trim() || undefined,
        category: editingBook.category?.trim() || undefined,
        description: editingBook.description?.trim() || "",
        price: Number(editingBook.price),
        condition: editingBook.condition || "Bom estado",
        pages: Number.isFinite(editingBook.pages) ? Number(editingBook.pages) : undefined,
        year: Number.isFinite(editingBook.year) ? Number(editingBook.year) : undefined,
        quantity: Math.max(0, Math.trunc(Number(editingBook.quantity))),
        availabilityStatus: editingBook.availabilityStatus || "ativo",
        isVisible: editingBook.isVisible ?? true,
        coverUrl: editingBook.coverUrl?.trim() || undefined,
      });
      cancelEditBook();
    } catch {
      // toast handled by mutation
    } finally {
      setIsSavingBook(false);
    }
  };

  const handleEditCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editingBook) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setEditingBook({ ...editingBook, coverUrl: objectUrl });
    setBookCoverOptions((prev) => {
      const current = prev[editingBook.id] || [];
      const next = [objectUrl, ...current.filter((url) => url !== objectUrl)].slice(0, 8);
      return { ...prev, [editingBook.id]: next };
    });
    toast.success("Pré-visualização da capa atualizada.");
  };

  if (loading && role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12">
          <div className="max-w-2xl mx-auto p-6 border border-red-200 bg-red-50 rounded-lg text-red-700">
            Acesso restrito ao administrador.
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isServerAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="container flex-1 py-12">
          <div className="max-w-2xl mx-auto p-6 border border-amber-200 bg-amber-50 rounded-lg text-amber-800">
            <p className="font-semibold">Sincronizando autenticação da sessão com o servidor.</p>
            <p className="mt-1 text-sm">
              {hasSessionToken
                ? "Se demorar, tente sincronizar novamente sem recarregar."
                : "Sua sessão local não está ativa. Faça login novamente."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void refresh()}
                className="px-3 py-2 rounded bg-[#262969] text-white text-sm"
              >
                Tentar sincronizar
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-12">
        <h1 className="font-outfit text-3xl font-bold text-[#262969] dark:text-gray-100 mb-6">Painel Admin</h1>
        {adminMetrics && (
          <section className="mb-8 space-y-4">
            <h2 className="text-sm font-semibold text-[#262969] dark:text-gray-100">Relatório Admin (Visão Global)</h2>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCharts((prev) => !prev)}
                className="px-3 py-2 text-sm rounded border border-[#262969] text-[#262969] hover:bg-[#262969] hover:text-white"
              >
                {showCharts ? "Ocultar gráficos" : "Exibir gráficos"}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 border rounded-lg bg-white">
                <p className="text-xs text-gray-500">Usuários</p>
                <p className="text-xl font-bold text-[#262969] dark:text-gray-100">{adminMetrics.users.total}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white">
                <p className="text-xs text-gray-500">Sebos</p>
                <p className="text-xl font-bold text-[#262969] dark:text-gray-100">{adminMetrics.sebos.total}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white">
                <p className="text-xs text-gray-500">Sebos ativos</p>
                <p className="text-xl font-bold text-emerald-700">{adminMetrics.sebos.active}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white">
                <p className="text-xs text-gray-500">Livros</p>
                <p className="text-xl font-bold text-[#262969] dark:text-gray-100">{adminMetrics.books.total}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white">
                <p className="text-xs text-gray-500">Crescimento 7d</p>
                <p className="text-xs text-gray-700 mt-1">Usuários: {adminMetrics.growth7d.users}</p>
                <p className="text-xs text-gray-700">Sebos: {adminMetrics.growth7d.sebos}</p>
                <p className="text-xs text-gray-700">Livros: {adminMetrics.growth7d.books}</p>
              </div>
            </div>
            {showCharts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-white">
                  <h2 className="font-semibold text-[#262969] dark:text-gray-100 mb-3">Perfis de usuário</h2>
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roleChartData}>
                        <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fill: chartAxisColor }} axisLine={{ stroke: chartAxisColor }} tickLine={{ stroke: chartAxisColor }} />
                        <YAxis allowDecimals={false} tick={{ fill: chartAxisColor }} axisLine={{ stroke: chartAxisColor }} tickLine={{ stroke: chartAxisColor }} />
                        <Tooltip
                          formatter={(value) => [formatChartNumber(value), "Quantidade"]}
                          contentStyle={chartTooltipContentStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                          cursor={{ fill: theme === "dark" ? "rgba(148,163,184,0.16)" : "rgba(100,116,139,0.12)" }}
                        />
                        <Bar dataKey="value" fill="#262969" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="p-4 border rounded-lg bg-white">
                  <h2 className="font-semibold text-[#262969] dark:text-gray-100 mb-3">Status dos livros</h2>
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={booksStatusChartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                          {booksStatusChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [formatChartNumber(value), "Livros"]}
                          contentStyle={chartTooltipContentStyle}
                          labelStyle={chartTooltipLabelStyle}
                          itemStyle={chartTooltipItemStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : null}
            {adminMetrics.recentAudit.length > 0 && (
              <div className="p-4 border rounded-lg bg-white">
                <h2 className="font-semibold text-[#262969] dark:text-gray-100 mb-2">Ações recentes (auditoria)</h2>
                <div className="space-y-1 text-sm text-gray-700 max-h-36 overflow-y-auto pr-1">
                  {(showFullAudit ? adminMetrics.recentAudit : adminMetrics.recentAudit.slice(0, 5)).map((item: any, idx: number) => (
                    <p key={`${item.action}-${item.createdAt}-${idx}`}>
                      {formatDateTimePtBr(item.createdAt)} • {item.action} • {item.entityType}
                      {item.entityId ? ` #${item.entityId}` : ""} • {item.actorRole || "sistema"}
                    </p>
                  ))}
                </div>
                {adminMetrics.recentAudit.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowFullAudit((prev) => !prev)}
                    className="mt-3 text-xs font-semibold text-[#262969] hover:text-[#da4653] underline"
                  >
                    {showFullAudit ? "Mostrar somente as últimas 5" : "Ver histórico completo"}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
        {activeError && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            <p className="font-semibold">Falha ao carregar dados desta aba.</p>
            <p className="mt-1">
              {activeError.message || "Tente novamente em instantes."}
            </p>
            {tab === "books" && (
              <p className="mt-1">
                Se o erro persistir no deploy, revise as migrações do banco D1 para a tabela
                <code> books </code> (especialmente coluna <code>quantity</code>).
              </p>
            )}
            <button
              onClick={() => {
                if (tab === "users") {
                  void usersQuery.refetch();
                  return;
                }
                if (tab === "sebos") {
                  void sebosQuery.refetch();
                  return;
                }
                void booksQuery.refetch();
              }}
              className="mt-3 px-3 py-2 rounded bg-[#262969] text-white"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setTab("users")} className={`px-4 py-2 rounded border ${tab === "users" ? "bg-[#262969] text-white" : "bg-white"}`}>Usuários</button>
          <button onClick={() => setTab("sebos")} className={`px-4 py-2 rounded border ${tab === "sebos" ? "bg-[#262969] text-white" : "bg-white"}`}>Sebos</button>
          <button onClick={() => setTab("books")} className={`px-4 py-2 rounded border ${tab === "books" ? "bg-[#262969] text-white" : "bg-white"}`}>Livros</button>
        </div>

        {tab === "users" && (
          <section className="space-y-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <h2 className="font-semibold text-[#262969] dark:text-gray-100 mb-3">Criar Usuário</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} placeholder="Nome" className="px-3 py-2 border rounded" />
                <input value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} placeholder="E-mail" className="px-3 py-2 border rounded" />
                <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as any }))} className="px-3 py-2 border rounded">
                  <option value="comprador">comprador</option>
                  <option value="livreiro">livreiro</option>
                  <option value="admin">admin</option>
                  <option value="user">user</option>
                </select>
                <button
                  onClick={() => {
                    if (!newUser.email) return toast.error("Informe e-mail.");
                    void adminCreateUserMutation.mutateAsync({
                      name: newUser.name || undefined,
                      email: newUser.email,
                      role: newUser.role,
                    });
                  }}
                  className="px-3 py-2 rounded bg-[#262969] text-white"
                >
                  Criar
                </button>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50">
              <h2 className="font-semibold text-[#262969] dark:text-gray-100 mb-3">Buscar Usuário</h2>
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filtrar por nome, e-mail ou ID"
                className="w-full md:w-[420px] px-3 py-2 border rounded"
              />
            </div>

            <div className="space-y-3 md:hidden">
              {filteredUsers.map((user: any) => (
                <div key={`mobile-user-${user.id}`} className="p-3 border rounded-lg bg-white">
                  <p className="font-semibold text-[#262969] dark:text-gray-100">{user.name || "Sem nome"}</p>
                  <p className="text-xs text-gray-600">ID {user.id}</p>
                  <p className="text-sm text-gray-700 mt-1">{user.email || "-"}</p>
                  <p className="text-xs text-gray-600 mt-1">{user.whatsapp || "Sem WhatsApp"}</p>
                  <p className="text-xs text-gray-600">
                    {user.city || "-"}{user.state ? ` / ${user.state}` : ""}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => {
                        void adminUpdateUserMutation.mutateAsync({
                          userId: user.id,
                          role: e.target.value as any,
                        });
                      }}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="comprador">comprador</option>
                      <option value="livreiro">livreiro</option>
                      <option value="admin">admin</option>
                      <option value="user">user</option>
                    </select>
                    <button
                      onClick={() => {
                        if (!confirm(`Remover usuário ${user.email || user.id}?`)) return;
                        void adminDeleteUserMutation.mutateAsync({ userId: user.id });
                      }}
                      className="px-2 py-1 rounded bg-red-600 text-white text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">E-mail</th>
                    <th className="text-left px-3 py-2">WhatsApp</th>
                    <th className="text-left px-3 py-2">Cidade/UF</th>
                    <th className="text-left px-3 py-2">Consent. LGPD</th>
                    <th className="text-left px-3 py-2">Role</th>
                    <th className="text-left px-3 py-2">Sebos</th>
                    <th className="text-left px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-3 py-2">{user.id}</td>
                      <td className="px-3 py-2">{user.name || "-"}</td>
                      <td className="px-3 py-2">{user.email || "-"}</td>
                      <td className="px-3 py-2">{user.whatsapp || "-"}</td>
                      <td className="px-3 py-2">
                        {user.city || "-"}{user.state ? ` / ${user.state}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        {user.lgpdConsentAt
                          ? formatDatePtBr(user.lgpdConsentAt)
                          : "Não"}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={user.role}
                          onChange={(e) => {
                            void adminUpdateUserMutation.mutateAsync({
                              userId: user.id,
                              role: e.target.value as any,
                            });
                          }}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="comprador">comprador</option>
                          <option value="livreiro">livreiro</option>
                          <option value="admin">admin</option>
                          <option value="user">user</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-1 text-xs rounded bg-indigo-50 text-indigo-700">
                          {seboCountByUserId.get(Number(user.id)) || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            if (!confirm(`Remover usuário ${user.email || user.id}?`)) return;
                            void adminDeleteUserMutation.mutateAsync({ userId: user.id });
                          }}
                          className="px-2 py-1 rounded bg-red-600 text-white"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "sebos" && (
          <section className="space-y-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <h2 className="font-semibold text-[#262969] dark:text-gray-100 mb-3">Criar Sebo</h2>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input value={newSebo.userId} onChange={(e) => setNewSebo((p) => ({ ...p, userId: e.target.value }))} placeholder="User ID" className="px-3 py-2 border rounded" />
                <input value={newSebo.name} onChange={(e) => setNewSebo((p) => ({ ...p, name: e.target.value }))} placeholder="Nome do sebo" className="px-3 py-2 border rounded" />
                <input value={newSebo.whatsapp} onChange={(e) => setNewSebo((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp" className="px-3 py-2 border rounded" />
                <input value={newSebo.city} onChange={(e) => setNewSebo((p) => ({ ...p, city: e.target.value }))} placeholder="Cidade" className="px-3 py-2 border rounded" />
                <input value={newSebo.state} onChange={(e) => setNewSebo((p) => ({ ...p, state: e.target.value }))} placeholder="UF" className="px-3 py-2 border rounded" />
                <button
                  onClick={() => {
                    const userId = Number.parseInt(newSebo.userId, 10);
                    if (!Number.isFinite(userId) || !newSebo.name || !newSebo.whatsapp) {
                      return toast.error("Preencha userId, nome e whatsapp.");
                    }
                    void adminCreateSeboMutation.mutateAsync({
                      userId,
                      name: newSebo.name,
                      whatsapp: newSebo.whatsapp,
                      city: newSebo.city || undefined,
                      state: newSebo.state || undefined,
                    });
                  }}
                  className="px-3 py-2 rounded bg-[#262969] text-white"
                >
                  Criar
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                <h3 className="font-semibold text-[#262969] dark:text-gray-100 mb-2">Avaliações recentes de sebos</h3>
                {(seboReviewsQuery.data || []).length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">Sem avaliações registradas nesta base.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {(seboReviewsQuery.data || []).map((review: any) => (
                      <div key={review.id} className="p-2 rounded border bg-white dark:bg-gray-800 dark:border-gray-700 text-sm">
                        <p className="font-semibold text-[#262969] dark:text-gray-100">
                          {review.seboName || `Sebo #${review.seboId}`} • {review.rating}/5
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {review.reviewerName || "Usuário"} ({review.reviewerEmail || "sem e-mail"})
                        </p>
                        {review.comment ? <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">{review.comment}</p> : null}
                        <button
                          type="button"
                          onClick={() =>
                            adminModerateReviewMutation.mutate({
                              reviewId: Number(review.id),
                              isVisible: !Boolean(review.isVisible),
                            })
                          }
                          className={`mt-2 px-2 py-1 rounded text-xs border ${
                            review.isVisible
                              ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700"
                              : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700"
                          }`}
                        >
                          {review.isVisible ? "Ocultar avaliação" : "Exibir avaliação"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {sebos.map((sebo: any) => (
                <div key={sebo.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#262969] dark:text-gray-100">{sebo.name}</p>
                        <span
                          className={`text-[11px] px-2 py-1 rounded font-semibold ${
                            sebo.plan === "gold"
                              ? "bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                              : sebo.plan === "pro"
                              ? "bg-[#da4653] text-[#262969] dark:bg-[#262969] dark:text-[#f3f4f6]"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                          }`}
                        >
                          {sebo.plan === "gold" ? "Gold" : sebo.plan === "pro" ? "Pro" : "Free"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        ID {sebo.id} • User {sebo.userId} • {sebo.city || "-"} / {sebo.state || "-"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Responsável: {usersById.get(Number(sebo.userId))?.email || "-"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Vitrine:{" "}
                        <a
                          href={(sebo.plan === "pro" || sebo.plan === "gold") && sebo.proSlug ? `/s/${sebo.proSlug}` : `/sebo/${sebo.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#da4653] hover:underline"
                        >
                          {(sebo.plan === "pro" || sebo.plan === "gold") && sebo.proSlug ? `/s/${sebo.proSlug}` : `/sebo/${sebo.id}`}
                        </a>
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Avaliação: {Number(sebo.reviewSummary?.avgRating ?? 0).toFixed(1)} ({Number(sebo.reviewSummary?.totalReviews ?? 0)} avaliações)
                        {sebo.reviewSummary?.topRated ? " • Top Avaliado" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            void adminSetSeboPlanMutation.mutateAsync({
                              id: Number(sebo.id),
                              plan: "free",
                            });
                          }}
                          className={`px-2 py-1 rounded text-sm border ${
                            sebo.plan === "free"
                              ? "bg-gray-700 text-white border-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:border-gray-200"
                              : "bg-white text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                          }`}
                        >
                          Free
                        </button>
                        <button
                          onClick={() => {
                            void adminSetSeboPlanMutation.mutateAsync({
                              id: Number(sebo.id),
                              plan: "pro",
                            });
                          }}
                          className={`px-2 py-1 rounded text-sm border ${
                            sebo.plan === "pro"
                              ? "bg-[#262969] text-white border-[#262969] dark:bg-[#da4653] dark:text-[#262969] dark:border-[#da4653]"
                              : "bg-white text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                          }`}
                        >
                          Pro
                        </button>
                        <button
                          onClick={() => {
                            void adminSetSeboPlanMutation.mutateAsync({
                              id: Number(sebo.id),
                              plan: "gold",
                            });
                          }}
                          className={`px-2 py-1 rounded text-sm border ${
                            sebo.plan === "gold"
                              ? "bg-amber-500 text-white border-amber-500 dark:bg-amber-300 dark:text-amber-950 dark:border-amber-300"
                              : "bg-white text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                          }`}
                        >
                          Gold
                        </button>
                      </div>
                      {(sebo.plan === "pro" || sebo.plan === "gold") && (
                        <button
                          onClick={() => {
                            const nextSlug = window.prompt("Informe o novo slug da vitrine:", String(sebo.proSlug || ""));
                            if (!nextSlug) return;
                            void adminSetSeboPlanMutation.mutateAsync({
                              id: Number(sebo.id),
                              plan: sebo.plan === "gold" ? "gold" : "pro",
                              proSlug: nextSlug,
                            });
                          }}
                          className="px-2 py-1 rounded border border-[#da4653] bg-[#da4653] text-[#262969] text-sm font-semibold dark:bg-[#262969] dark:text-white dark:border-[#262969]"
                        >
                          Editar slug
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!confirm(`Excluir sebo "${sebo.name}"?`)) return;
                          void adminDeleteSeboMutation.mutateAsync({ id: sebo.id });
                        }}
                        className="px-2 py-1 rounded border border-red-600 bg-red-600 text-white text-sm dark:bg-red-700 dark:border-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                      defaultValue={sebo.name || ""}
                      onBlur={(e) => {
                        if (e.target.value === sebo.name) return;
                        void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, name: e.target.value || undefined });
                      }}
                      className="px-3 py-2 border rounded"
                      placeholder="Nome"
                    />
                    <input
                      defaultValue={sebo.whatsapp || ""}
                      onBlur={(e) => {
                        if (e.target.value === sebo.whatsapp) return;
                        void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, whatsapp: e.target.value || undefined });
                      }}
                      className="px-3 py-2 border rounded"
                      placeholder="WhatsApp"
                    />
                    <input
                      defaultValue={sebo.city || ""}
                      onBlur={(e) => {
                        if (e.target.value === sebo.city) return;
                        void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, city: e.target.value || undefined });
                      }}
                      className="px-3 py-2 border rounded"
                      placeholder="Cidade"
                    />
                    <input
                      defaultValue={sebo.state || ""}
                      onBlur={(e) => {
                        if (e.target.value === sebo.state) return;
                        void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, state: e.target.value || undefined });
                      }}
                      className="px-3 py-2 border rounded"
                      placeholder="UF"
                    />
                    <input
                      defaultValue={sebo.maxActiveBooks ?? ""}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        const parsed = next ? Number.parseInt(next, 10) : NaN;
                        const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
                        if ((sebo.maxActiveBooks ?? undefined) === normalized) return;
                        void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, maxActiveBooks: normalized });
                      }}
                      className="px-3 py-2 border rounded"
                      placeholder="Limite override (ativos)"
                    />
                    <label className="inline-flex items-center gap-2 px-2">
                      <input
                        type="checkbox"
                        defaultChecked={Boolean(sebo.verified)}
                        onChange={(e) => {
                          void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, verified: e.target.checked });
                        }}
                      />
                      Verificado
                    </label>
                    <label className="inline-flex items-center gap-2 px-2">
                      <input
                        type="checkbox"
                        defaultChecked={Boolean(sebo.showPublicPhone)}
                        onChange={(e) => {
                          void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, showPublicPhone: e.target.checked });
                        }}
                      />
                      WhatsApp público
                    </label>
                    <label className="inline-flex items-center gap-2 px-2">
                      <input
                        type="checkbox"
                        defaultChecked={Boolean(sebo.showPublicAddress)}
                        onChange={(e) => {
                          void adminUpdateSeboMutation.mutateAsync({ id: sebo.id, showPublicAddress: e.target.checked });
                        }}
                      />
                      Endereço público
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "books" && (
          <section className="space-y-4">
            {booksQuery.isFetching && (
              <div className="p-3 rounded border border-gray-200 bg-gray-50 text-sm text-gray-700">
                Carregando livros...
              </div>
            )}
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-700">Filtrar por Sebo:</label>
                  <select
                    value={selectedSeboId ?? ""}
                    onChange={(e) => {
                      setSelectedSeboId(e.target.value ? Number.parseInt(e.target.value, 10) : null);
                      setBooksPage(0);
                    }}
                    className="mt-1 w-full px-3 py-2 border rounded"
                  >
                    <option value="">Todos</option>
                    {sebos.map((sebo: any) => (
                      <option key={sebo.id} value={sebo.id}>
                        #{sebo.id} - {sebo.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-700">Buscar Livro:</label>
                  <input
                    value={booksFilter}
                    onChange={(e) => setBooksFilter(e.target.value)}
                    placeholder="ID, título, autor, ISBN ou sebo"
                    className="mt-1 w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Filtro de Capa:</label>
                  <select
                    value={booksCoverFilter}
                    onChange={(e) => setBooksCoverFilter(e.target.value as "all" | "with-cover" | "no-cover")}
                    className="mt-1 w-full px-3 py-2 border rounded"
                  >
                    <option value="all">Todos</option>
                    <option value="no-cover">Sem capa</option>
                    <option value="with-cover">Com capa</option>
                  </select>
                </div>
              </div>
            </div>

            {editingBook ? (
              <div className="p-4 border rounded-lg bg-white space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#262969]">Editando livro #{editingBook.id}</h3>
                  <button onClick={cancelEditBook} className="px-3 py-2 rounded border">Cancelar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editingBook.title}
                    onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                    placeholder="Título"
                  />
                  <input
                    type="text"
                    value={editingBook.author || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                    placeholder="Autor"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={String(editingBook.price)}
                    onChange={(e) => setEditingBook({ ...editingBook, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                    placeholder="Preço"
                  />
                  <input
                    type="text"
                    value={editingBook.isbn || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, isbn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                    placeholder="ISBN"
                  />
                  <input
                    type="text"
                    value={editingBook.category || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                    placeholder="Categoria"
                  />
                  <select
                    value={editingBook.condition || "Bom estado"}
                    onChange={(e) => setEditingBook({ ...editingBook, condition: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Excelente">Excelente</option>
                    <option value="Bom estado">Bom estado</option>
                    <option value="Usado">Usado</option>
                    <option value="Desgastado">Desgastado</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={editingBook.pages ?? ""}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, pages: e.target.value ? Number.parseInt(e.target.value, 10) : undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      placeholder="Páginas"
                    />
                    <input
                      type="number"
                      min={0}
                      value={editingBook.year ?? ""}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, year: e.target.value ? Number.parseInt(e.target.value, 10) : undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                      placeholder="Ano"
                    />
                  </div>
                  <textarea
                    value={editingBook.description || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none resize-y md:col-span-2"
                    placeholder="Descrição"
                  />
                  <input
                    type="number"
                    min={0}
                    value={String(editingBook.quantity)}
                    onChange={(e) => setEditingBook({ ...editingBook, quantity: Number.parseInt(e.target.value || "0", 10) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                    placeholder="Quantidade"
                  />
                  <select
                    value={editingBook.availabilityStatus || "ativo"}
                    onChange={(e) => setEditingBook({ ...editingBook, availabilityStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none"
                  >
                    <option value="ativo">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                  </select>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingBook.isVisible ?? true}
                      onChange={(e) => setEditingBook({ ...editingBook, isVisible: e.target.checked })}
                    />
                    Visível para compradores
                  </label>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-600 mb-2">Pré-visualização da capa</p>
                    <div className="rounded-lg overflow-hidden border border-gray-200 aspect-[2/3] w-32 bg-white">
                      <BookCover
                        isbn={editingBook.isbn ?? undefined}
                        title={editingBook.title}
                        author={editingBook.author ?? undefined}
                        coverUrl={editingBook.coverUrl ?? undefined}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={editingBook.coverUrl || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, coverUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#da4653] outline-none md:col-span-2"
                    placeholder="URL da capa (https://...)"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void fetchCoverOptionsByIsbn(editingBook)} className="teka-cover-btn teka-cover-btn--primary">
                    {coverLoadingId === editingBook.id ? "Buscando..." : "Trocar capa (ISBN)"}
                  </button>
                  <button type="button" onClick={() => void fetchCoverOptionsByText(editingBook)} className="teka-cover-btn teka-cover-btn--primary">
                    Trocar capa (título/autor)
                  </button>
                  <button type="button" onClick={() => setEditingBook({ ...editingBook, coverUrl: "" })} className="teka-cover-btn teka-cover-btn--danger">
                    Remover capa
                  </button>
                </div>
                {bookCoverOptions[editingBook.id]?.length ? (
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {bookCoverOptions[editingBook.id].slice(0, 8).map((coverOption) => (
                      <button
                        key={`${editingBook.id}-${coverOption}`}
                        type="button"
                        onClick={() => setEditingBook({ ...editingBook, coverUrl: coverOption })}
                        className={`rounded border-2 overflow-hidden ${editingBook.coverUrl === coverOption ? "border-[#da4653]" : "border-gray-200 hover:border-[#da4653]"}`}
                      >
                        <img src={coverOption} alt="Opção de capa" className="w-full h-20 object-contain bg-white" />
                      </button>
                    ))}
                  </div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Atualizar Capa</label>
                  <label className="block border-2 border-dashed border-gray-300 rounded p-3 text-center cursor-pointer hover:border-[#da4653]">
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-600">Clique para atualizar</p>
                    <input type="file" accept="image/*" onChange={handleEditCoverChange} className="hidden" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => void saveEditBook()} disabled={isSavingBook} className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">
                    {isSavingBook ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={cancelEditBook} className="px-4 py-2 rounded border">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Página {booksPage + 1}
                {filteredBooks.length > 0 ? ` • ${filteredBooks.length} registro(s)` : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBooksPage((p) => Math.max(0, p - 1))}
                  disabled={booksPage === 0 || booksQuery.isFetching}
                  className="px-3 py-2 rounded border disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setBooksPage((p) => p + 1)}
                  disabled={books.length < BOOKS_PAGE_SIZE || booksQuery.isFetching}
                  className="px-3 py-2 rounded border disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredBooks.map((book: any) => (
                <div key={`admin-book-mobile-${book.id}`} className="p-3 border rounded-lg bg-white">
                  <p className="font-semibold text-[#262969]">{book.title}</p>
                  <p className="text-xs text-gray-600">#{book.id} • {book.sebo?.name || "-"}</p>
                  <p className="text-sm text-gray-700 mt-1">R$ {Number(book.price).toFixed(2)} • Qtd {Number(book.quantity ?? 1)}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEditBook(book)} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Editar</button>
                    <button
                      onClick={() => {
                        if (!confirm(`Excluir livro "${book.title}"?`)) return;
                        void adminDeleteBookMutation.mutateAsync(book.id);
                      }}
                      className="px-3 py-2 rounded bg-red-600 text-white text-sm"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Título</th>
                    <th className="text-left px-3 py-2">Sebo</th>
                    <th className="text-left px-3 py-2">Preço</th>
                    <th className="text-left px-3 py-2">Qtd</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Visível</th>
                    <th className="text-left px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book: any) => (
                    <tr key={book.id} className="border-t">
                      <td className="px-3 py-2">{book.id}</td>
                      <td className="px-3 py-2">{book.title}</td>
                      <td className="px-3 py-2">{book.sebo?.name || "-"}</td>
                      <td className="px-3 py-2">R$ {Number(book.price).toFixed(2)}</td>
                      <td className="px-3 py-2">{Number(book.quantity ?? 1)}</td>
                      <td className="px-3 py-2">{book.availabilityStatus || "ativo"}</td>
                      <td className="px-3 py-2">{(book.isVisible ?? true) ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => startEditBook(book)} className="px-2 py-1 rounded bg-blue-600 text-white">Editar</button>
                          <button
                            onClick={() => {
                              if (!confirm(`Excluir livro "${book.title}"?`)) return;
                              void adminDeleteBookMutation.mutateAsync(book.id);
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
