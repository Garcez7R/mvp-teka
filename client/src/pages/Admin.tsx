import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AdminTab = "users" | "sebos" | "books";

export default function Admin() {
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
  const users = usersQuery.data ?? [];
  const sebos = sebosQuery.data ?? [];
  const books = booksQuery.data ?? [];

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
    if (!normalizedBooksFilter) return books;
    return books.filter((book: any) => {
      const id = String(book.id ?? "");
      const title = String(book.title ?? "").toLowerCase();
      const author = String(book.author ?? "").toLowerCase();
      const isbn = String(book.isbn ?? "").toLowerCase();
      const seboName = String(book.sebo?.name ?? "").toLowerCase();
      return (
        id.includes(normalizedBooksFilter) ||
        title.includes(normalizedBooksFilter) ||
        author.includes(normalizedBooksFilter) ||
        isbn.includes(normalizedBooksFilter) ||
        seboName.includes(normalizedBooksFilter)
      );
    });
  }, [books, normalizedBooksFilter]);

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
        <h1 className="font-outfit text-3xl font-bold text-[#262969] mb-6">Painel Admin</h1>
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
              <h2 className="font-semibold text-[#262969] mb-3">Criar Usuário</h2>
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
              <h2 className="font-semibold text-[#262969] mb-3">Buscar Usuário</h2>
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filtrar por nome, e-mail ou ID"
                className="w-full md:w-[420px] px-3 py-2 border rounded"
              />
            </div>

            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">E-mail</th>
                    <th className="text-left px-3 py-2">Role</th>
                    <th className="text-left px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: any) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-3 py-2">{user.id}</td>
                      <td className="px-3 py-2">{user.name || "-"}</td>
                      <td className="px-3 py-2">{user.email || "-"}</td>
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
              <h2 className="font-semibold text-[#262969] mb-3">Criar Sebo</h2>
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
              {sebos.map((sebo: any) => (
                <div key={sebo.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#262969]">{sebo.name}</p>
                      <p className="text-sm text-gray-600">
                        ID {sebo.id} • User {sebo.userId} • {sebo.city || "-"} / {sebo.state || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Responsável: {usersById.get(Number(sebo.userId))?.email || "-"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm(`Excluir sebo "${sebo.name}"?`)) return;
                        void adminDeleteSeboMutation.mutateAsync({ id: sebo.id });
                      }}
                      className="px-2 py-1 rounded bg-red-600 text-white text-sm"
                    >
                      Excluir
                    </button>
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
              </div>
            </div>
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

            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Título</th>
                    <th className="text-left px-3 py-2">Sebo</th>
                    <th className="text-left px-3 py-2">Preço</th>
                    <th className="text-left px-3 py-2">Qtd</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book: any) => (
                    <tr key={book.id} className="border-t">
                      <td className="px-3 py-2">{book.id}</td>
                      <td className="px-3 py-2">{book.title}</td>
                      <td className="px-3 py-2">{book.sebo?.name || "-"}</td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={String(book.price)}
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 px-2 py-1 border rounded"
                          onBlur={(e) => {
                            const nextPrice = Number(e.target.value);
                            if (!Number.isFinite(nextPrice) || nextPrice <= 0 || nextPrice === Number(book.price)) return;
                            void adminUpdateBookMutation.mutateAsync({ id: book.id, price: nextPrice });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          defaultValue={String(book.quantity ?? 1)}
                          type="number"
                          min="0"
                          className="w-20 px-2 py-1 border rounded"
                          onBlur={(e) => {
                            const nextQuantity = Number.parseInt(e.target.value, 10);
                            if (!Number.isFinite(nextQuantity) || nextQuantity < 0 || nextQuantity === Number(book.quantity ?? 1)) return;
                            void adminUpdateBookMutation.mutateAsync({
                              id: book.id,
                              quantity: nextQuantity,
                              ...(nextQuantity === 0 ? { availabilityStatus: "vendido" as const } : {}),
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={book.availabilityStatus || "ativo"}
                          onChange={(e) => {
                            void adminUpdateBookMutation.mutateAsync({
                              id: book.id,
                              availabilityStatus: e.target.value as any,
                            });
                          }}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="ativo">ativo</option>
                          <option value="reservado">reservado</option>
                          <option value="vendido">vendido</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            if (!confirm(`Excluir livro "${book.title}"?`)) return;
                            void adminDeleteBookMutation.mutateAsync(book.id);
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
      </main>
      <Footer />
    </div>
  );
}
