import { useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { setSessionUserId } from "@/lib/session";
import { trackEvent } from "@/lib/analytics";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"livreiro" | "comprador">("livreiro");
  const [error, setError] = useState("");

  const loginMutation = trpc.users.loginByEmail.useMutation();
  const registerMutation = trpc.users.register.useMutation();

  const refreshSessionAndGo = async (userId: number, destination = "/") => {
    setSessionUserId(userId);
    await utils.auth.me.invalidate();
    navigate(destination);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = await loginMutation.mutateAsync({ email });
      trackEvent("login_success", { role: user.role });
      await refreshSessionAndGo(user.id, user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no login";
      setError(message);
      trackEvent("login_error", { message });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const created = await registerMutation.mutateAsync({
        name,
        email,
        role,
      });
      trackEvent("register_success", { role });
      await refreshSessionAndGo(created[0].id, role === "livreiro" ? "/sebo/novo" : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no cadastro";
      setError(message);
      trackEvent("register_error", { message });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="container flex-1 py-12">
        <div className="max-w-xl mx-auto border border-gray-200 rounded-xl p-8 bg-gray-50">
          <h1 className="font-outfit text-3xl font-bold text-[#262969] mb-2">Entrar na TEKA</h1>
          <p className="text-gray-600 mb-6">Acesso para livreiros, clientes e administradores.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mb-8">
            <label className="block text-sm font-medium text-gray-700">
              E-mail
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-[#262969] hover:bg-[#1e2157] text-white font-semibold py-3 rounded-lg disabled:opacity-60"
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="font-semibold text-[#262969] mb-3">Primeiro acesso</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Nome
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de conta
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "livreiro" | "comprador")}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#da4653] outline-none"
                >
                  <option value="livreiro">Livreiro</option>
                  <option value="comprador">Comprador</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-[#da4653] hover:bg-[#c23a45] text-white font-semibold py-3 rounded-lg disabled:opacity-60"
              >
                {registerMutation.isPending ? "Criando conta..." : "Criar conta"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
