import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type AdminTab = "users" | "sebos" | "books";

export default function Admin() {
  const { isAuthenticated, role, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<AdminTab>("users");
  const [selectedSeboId, setSelectedSeboId] = useState<number | null>(null);

  const { data: users = [] } = trpc.users.adminList.useQuery(undefined, {
    enabled: isAuthenticated && role === "admin",
  });
  const { data: sebos = [] } = trpc.sebos.list.useQuery(undefined, {
    enabled: isAuthenticated && role === "admin",
  });
  const { data: books = [] } = trpc.books.list.useQuery(
    {
      limit: 500,
      offset: 0,
      seboId: selectedSeboId ?? undefined,
    },
    { enabled: isAuthenticated && role === "admin" }
  );

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

  const adminCreateBookMutation = trpc.books.create.useMutation({
    onSuccess: async () => {
      await utils.books.list.invalidate();
      toast.success("Livro criado.");
    },
    onError: (error) => toast.error(error.message || "Erro ao criar livro."),
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
  const [newBook, setNewBook] = useState({
    seboId: "",
    title: "",
    author: "",
    category: "",
    price: "",
    condition: "Bom estado" as "Excelente" | "Bom estado" | "Usado" | "Desgastado",
    availabilityStatus: "ativo" as "ativo" | "reservado" | "vendido",
    quantity: "1",
  });

  const usersById = useMemo(
    () => new Map(users.map((user: any) => [Number(user.id), user])),
    [users]
  );

  if (loading) {
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

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-12">
        <h1 className="font-outfit text-3xl font-bold text-[#262969] mb-6">Painel Admin</h1>

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
                  {users.map((user: any) => (
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input value={newSebo.userId} onChange={(e) => setNewSebo((p) => ({ ...p, userId: e.target.value }))} placeholder="User ID" className="px-3 py-2 border rounded" />
                <input value={newSebo.name} onChange={(e) => setNewSebo((p) => ({ ...p, name: e.target.value }))} placeholder="Nome do sebo" className="px-3 py-2 border rounded" />
                <input value={newSebo.whatsapp} onChange={(e) => setNewSebo((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp" className="px-3 py-2 border rounded" />
                <input value={newSebo.city} onChange={(e) => setNewSebo((p) => ({ ...p, city: e.target.value }))} placeholder="Cidade" className="px-3 py-2 border rounded" />
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
            <div className="p-4 border rounded-lg bg-gray-50">
              <h2 className="font-semibold text-[#262969] mb-3">Criar Livro</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input value={newBook.seboId} onChange={(e) => setNewBook((p) => ({ ...p, seboId: e.target.value }))} placeholder="Sebo ID" className="px-3 py-2 border rounded" />
                <input value={newBook.title} onChange={(e) => setNewBook((p) => ({ ...p, title: e.target.value }))} placeholder="Título" className="px-3 py-2 border rounded" />
                <input value={newBook.author} onChange={(e) => setNewBook((p) => ({ ...p, author: e.target.value }))} placeholder="Autor" className="px-3 py-2 border rounded" />
                <input value={newBook.category} onChange={(e) => setNewBook((p) => ({ ...p, category: e.target.value }))} placeholder="Categoria" className="px-3 py-2 border rounded" />
                <input value={newBook.price} onChange={(e) => setNewBook((p) => ({ ...p, price: e.target.value }))} placeholder="Preço" type="number" min="0" step="0.01" className="px-3 py-2 border rounded" />
                <select value={newBook.condition} onChange={(e) => setNewBook((p) => ({ ...p, condition: e.target.value as any }))} className="px-3 py-2 border rounded">
                  <option value="Excelente">Excelente</option>
                  <option value="Bom estado">Bom estado</option>
                  <option value="Usado">Usado</option>
                  <option value="Desgastado">Desgastado</option>
                </select>
                <select value={newBook.availabilityStatus} onChange={(e) => setNewBook((p) => ({ ...p, availabilityStatus: e.target.value as any }))} className="px-3 py-2 border rounded">
                  <option value="ativo">Disponível</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                </select>
                <input value={newBook.quantity} onChange={(e) => setNewBook((p) => ({ ...p, quantity: e.target.value }))} placeholder="Quantidade" type="number" min="0" className="px-3 py-2 border rounded" />
                <button
                  onClick={() => {
                    const seboId = Number.parseInt(newBook.seboId, 10);
                    const price = Number(newBook.price);
                    const quantity = Number.parseInt(newBook.quantity, 10);
                    if (!Number.isFinite(seboId) || !newBook.title || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity < 0) {
                      return toast.error("Preencha sebo, título, preço e quantidade válidos.");
                    }
                    void adminCreateBookMutation.mutateAsync({
                      seboId,
                      title: newBook.title,
                      author: newBook.author || "Desconhecido",
                      category: newBook.category || "Outros",
                      price,
                      quantity,
                      condition: newBook.condition,
                      availabilityStatus: newBook.availabilityStatus,
                    });
                  }}
                  className="px-3 py-2 rounded bg-[#262969] text-white"
                >
                  Criar
                </button>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <label className="text-sm text-gray-700 mr-2">Filtrar por Sebo:</label>
              <select
                value={selectedSeboId ?? ""}
                onChange={(e) => setSelectedSeboId(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                className="px-3 py-2 border rounded"
              >
                <option value="">Todos</option>
                {sebos.map((sebo: any) => (
                  <option key={sebo.id} value={sebo.id}>
                    #{sebo.id} - {sebo.name}
                  </option>
                ))}
              </select>
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
                  {books.map((book: any) => (
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
