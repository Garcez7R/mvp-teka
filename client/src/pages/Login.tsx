import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { setLegacyEmailSession, setSessionIdToken, setSignupRole } from "@/lib/session";
import { trackEvent } from "@/lib/analytics";
import { isGoogleAuthEnabled } from "@/lib/auth-mode";
import { TRPCClientError } from "@trpc/client";

export default function Login() {
  const utils = trpc.useUtils();
  const setMyRoleMutation = trpc.users.setMyRole.useMutation();
  const updateUserMutation = trpc.users.update.useMutation();
  const loginByEmailMutation = trpc.users.loginByEmail.useMutation();
  const registerMutation = trpc.users.register.useMutation();
  const [role, setRole] = useState<"livreiro" | "comprador">("comprador");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const roleRef = useRef<"livreiro" | "comprador">("comprador");
  const googleContainerRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleEnabled = useMemo(() => isGoogleAuthEnabled(), []);
  const googleClientId = useMemo(
    () => (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim(),
    []
  );

  const isGoogleConfigured = googleEnabled && Boolean(googleClientId);

  const sleep = (ms: number) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });

  const ensureServerSession = async () => {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await utils.auth.me.invalidate();
        const me = await utils.auth.me.fetch();
        if (me) {
          return me;
        }
      } catch {
        // Retry below.
      }
      if (attempt < maxAttempts) {
        await sleep(350);
      }
    }
    throw new Error("Not authenticated");
  };

  const refreshSessionAndGo = async (destination = "/") => {
    try {
      await ensureServerSession();
    } catch {
      // In Cloudflare/proxy contexts the first auth sync can lag a bit.
      // Redirect anyway and let app-level auth refresh continue on the next screen.
    }
    window.location.assign(destination);
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
              if (consentChecked) {
                await updateUserMutation.mutateAsync({ lgpdConsent: true });
              }
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

  const handleLegacyEmailLogin = async () => {
    try {
      setError("");
      if (!consentChecked) {
        setError("Para continuar, marque “Estou ciente” sobre tratamento de dados.");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();
      if (!normalizedEmail) {
        setError("Informe um e-mail válido.");
        return;
      }

      setIsBusy(true);
      const selectedRole = roleRef.current;
      setSignupRole(selectedRole);
      setLegacyEmailSession({
        email: normalizedEmail,
        name: normalizedName || null,
      });

      try {
        await loginByEmailMutation.mutateAsync({ email: normalizedEmail });
      } catch (err) {
        const isUnauthorized =
          err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED";
        if (!isUnauthorized) {
          throw err;
        }
        if (!normalizedName) {
          setError("Primeiro acesso: informe também seu nome para criar a conta.");
          return;
        }
        await registerMutation.mutateAsync({
          name: normalizedName,
          email: normalizedEmail,
          role: selectedRole,
        });
      }

      try {
        await setMyRoleMutation.mutateAsync({ role: selectedRole });
        if (consentChecked) {
          await updateUserMutation.mutateAsync({ lgpdConsent: true });
        }
      } catch {
        // Mantém fluxo não bloqueante.
      }

      await refreshSessionAndGo("/");
      trackEvent("legacy_email_login_success", { role: selectedRole });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no login por e-mail";
      setError(message);
      trackEvent("legacy_email_login_error", { message });
    } finally {
      setIsBusy(false);
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

          <div className="space-y-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de conta no primeiro acesso
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("comprador")}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    role === "comprador"
                      ? "bg-[#da4653] text-white border-[#da4653]"
                      : "bg-white text-[#262969] border-[#da4653] hover:bg-[#ffe9eb]"
                  }`}
                >
                  Comprador
                </button>
                <button
                  type="button"
                  onClick={() => setRole("livreiro")}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    role === "livreiro"
                      ? "bg-[#da4653] text-white border-[#da4653]"
                      : "bg-white text-[#262969] border-[#da4653] hover:bg-[#ffe9eb]"
                  }`}
                >
                  Livreiro
                </button>
              </div>
            </div>

            {isGoogleConfigured ? (
              <div className="w-full flex justify-center relative">
                <div ref={googleContainerRef} />
                {!consentChecked && (
                  <button
                    type="button"
                    onClick={() =>
                      setError(
                        "Para continuar, marque “Estou ciente” sobre tratamento de dados."
                      )
                    }
                    className="absolute inset-0 bg-transparent"
                    aria-label="Ative o consentimento para habilitar login"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-[#262969]"
                />
                <input
                  type="text"
                  placeholder="Seu nome (obrigatório no primeiro acesso)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-[#262969]"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleLegacyEmailLogin()}
                  className="w-full rounded-lg border border-[#da4653] bg-[#da4653] text-white px-4 py-2 font-medium disabled:opacity-60"
                >
                  Entrar com e-mail
                </button>
              </div>
            )}
            <label className="block text-xs text-gray-700 dark:text-gray-200">
              <span className="inline-flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 accent-[#da4653]"
                />
                <span>
                  Estou ciente do tratamento de dados para autenticação, segurança e cumprimento de obrigação legal,
                  conforme LGPD (Lei nº 13.709/2018, arts. 7º, 18 e 46) e Marco Civil da Internet (Lei nº 12.965/2014, art. 15).
                </span>
              </span>
            </label>
            {!consentChecked && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Marque “Estou ciente” para habilitar o login.
              </p>
            )}
            {isBusy && (
              <p className="text-sm text-gray-600 text-center">Conectando...</p>
            )}

            {!isGoogleConfigured && googleEnabled && (
              <p className="text-xs text-red-600">
                Defina <code>VITE_GOOGLE_CLIENT_ID</code> no ambiente para habilitar o login.
              </p>
            )}
            {!googleEnabled && (
              <p className="text-xs text-gray-600">
                Google desativado neste ambiente. Login por e-mail habilitado para testes.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
