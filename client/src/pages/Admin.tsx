import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Admin() {
  const { isAuthenticated, role, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { data: users = [] } = trpc.users.adminList.useQuery(undefined, {
    enabled: isAuthenticated && role === "admin",
  });
  const updateRoleMutation = trpc.users.adminUpdateRole.useMutation({
    onSuccess: async () => {
      await utils.users.adminList.invalidate();
    },
  });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">E-mail</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-t border-gray-200">
                  <td className="px-4 py-3">{user.id}</td>
                  <td className="px-4 py-3">{user.name ?? "-"}</td>
                  <td className="px-4 py-3">{user.email ?? "-"}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={async (e) => {
                        const nextRole = e.target.value as "admin" | "livreiro" | "comprador" | "user";
                        setUpdatingId(user.id);
                        try {
                          await updateRoleMutation.mutateAsync({
                            userId: user.id,
                            role: nextRole,
                          });
                        } finally {
                          setUpdatingId(null);
                        }
                      }}
                      className="px-3 py-1 border border-gray-300 rounded"
                    >
                      <option value="comprador">comprador</option>
                      <option value="livreiro">livreiro</option>
                      <option value="admin">admin</option>
                      <option value="user">user</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
