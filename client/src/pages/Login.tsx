import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { clearSignupRole, setSessionIdToken, setSignupRole } from "@/lib/session";
import { trackEvent } from "@/lib/analytics";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [role, setRole] = useState<"livreiro" | "comprador">("livreiro");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const googleClientId = useMemo(
    () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),
    []
  );

  const isGoogleConfigured = Boolean(googleClientId);

  const refreshSessionAndGo = async (destination = "/") => {
    await utils.auth.me.invalidate();
    clearSignupRole();
    navigate(destination);
  };

  const handleGoogleLogin = async () => {
    setError("");
    if (!isGoogleConfigured) {
      setError("Google Sign-In não configurado. Defina VITE_GOOGLE_CLIENT_ID.");
      return;
    }

    if (typeof window === "undefined" || !(window as any).google?.accounts?.id) {
      setError("SDK do Google não carregado. Recarregue a página e tente novamente.");
      return;
    }

    setSignupRole(role);

    (window as any).google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: { credential?: string }) => {
        try {
          setIsBusy(true);
          if (!response?.credential) {
            throw new Error("Não foi possível obter o token do Google.");
          }
          setSessionIdToken(response.credential);
          await refreshSessionAndGo(role === "livreiro" ? "/sebo/novo" : "/");
          trackEvent("google_login_success", { role });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha no login com Google";
          setError(message);
          trackEvent("google_login_error", { message });
        } finally {
          setIsBusy(false);
        }
      },
    });

    (window as any).google.accounts.id.prompt((notification: any) => {
      if (notification?.isNotDisplayed?.()) {
        const reason = notification?.getNotDisplayedReason?.();
        setError(
          `Google Sign-In indisponível neste contexto${reason ? ` (${reason})` : ""}.`
        );
      } else if (notification?.isSkippedMoment?.()) {
        setError("Login do Google foi ignorado. Tente novamente.");
      } else if (notification?.isDismissedMoment?.()) {
        setError("Login do Google foi fechado antes de concluir.");
      }
    });
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

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de conta no primeiro acesso
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
              onClick={handleGoogleLogin}
              disabled={isBusy}
              className="w-full bg-[#262969] hover:bg-[#1e2157] text-white font-semibold py-3 rounded-lg disabled:opacity-60"
            >
              {isBusy ? "Conectando..." : "Entrar com Google"}
            </button>

            {!isGoogleConfigured && (
              <p className="text-xs text-red-600">
                Defina <code>VITE_GOOGLE_CLIENT_ID</code> no ambiente para habilitar o login.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
