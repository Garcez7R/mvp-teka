import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { setSessionIdToken, setSignupRole } from "@/lib/session";
import { trackEvent } from "@/lib/analytics";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const setMyRoleMutation = trpc.users.setMyRole.useMutation();
  const [role, setRole] = useState<"livreiro" | "comprador">("livreiro");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const roleRef = useRef<"livreiro" | "comprador">("livreiro");
  const googleContainerRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = useMemo(
    () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),
    []
  );

  const isGoogleConfigured = Boolean(googleClientId);

  const refreshSessionAndGo = async (destination = "/") => {
    await utils.auth.me.invalidate();
    navigate(destination);
  };

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    if (!isGoogleConfigured) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;
    const timer = window.setInterval(() => {
      if (googleInitializedRef.current) {
        window.clearInterval(timer);
        return;
      }

      const googleApi = (window as any).google?.accounts?.id;
      const container = googleContainerRef.current;
      if (!googleApi || !container) {
        attempts += 1;
        if (attempts >= maxAttempts) {
          setError("SDK do Google não carregado. Recarregue a página e tente novamente.");
          window.clearInterval(timer);
        }
        return;
      }

      googleApi.initialize({
        client_id: googleClientId,
        callback: async (response: { credential?: string }) => {
          try {
            setError("");
            setIsBusy(true);
            if (!response?.credential) {
              throw new Error("Não foi possível obter o token do Google.");
            }
            const selectedRole = roleRef.current;
            setSignupRole(selectedRole);
            setSessionIdToken(response.credential);
            try {
              await setMyRoleMutation.mutateAsync({ role: selectedRole });
            } catch {
              // In some runtimes the first authenticated call may race with context creation.
              // Keep login flow non-blocking; role will be reconciled by subsequent requests.
            }
            await refreshSessionAndGo("/");
            trackEvent("google_login_success", { role: selectedRole });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Falha no login com Google";
            setError(message);
            trackEvent("google_login_error", { message });
          } finally {
            setIsBusy(false);
          }
        },
      });

      container.innerHTML = "";
      googleApi.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
        shape: "pill",
      });
      googleInitializedRef.current = true;
      window.clearInterval(timer);
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [googleClientId, isGoogleConfigured]);

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

            <div className="w-full flex justify-center">
              <div ref={googleContainerRef} />
            </div>
            {isBusy && (
              <p className="text-sm text-gray-600 text-center">Conectando...</p>
            )}

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
