import { createRoot } from "react-dom/client";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { trpc } from "./lib/trpc";
import { getSessionIdToken, getSignupRole } from "./lib/session";
import "./index.css";

type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __TEKA_BEFORE_INSTALL_PROMPT__?: BeforeInstallPromptEventLike;
  }
}

function setupPwaRuntime() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const SW_RELOAD_FLAG = "teka_sw_reloaded_once";
  if (!navigator.serviceWorker.controller) {
    window.sessionStorage.removeItem(SW_RELOAD_FLAG);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (window.sessionStorage.getItem(SW_RELOAD_FLAG) === "1") {
      return;
    }
    window.sessionStorage.setItem(SW_RELOAD_FLAG, "1");
    window.location.reload();
  });

  void (async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });

      await registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    } catch (error) {
      console.warn("Falha ao registrar Service Worker:", error);
    }
  })();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__TEKA_BEFORE_INSTALL_PROMPT__ = event as BeforeInstallPromptEventLike;
    window.dispatchEvent(new CustomEvent("teka:pwa-install-available"));
  });

  window.addEventListener("appinstalled", () => {
    window.__TEKA_BEFORE_INSTALL_PROMPT__ = undefined;
    window.dispatchEvent(new CustomEvent("teka:pwa-installed"));
  });
}

setupPwaRuntime();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "";
const runtimePort = typeof window !== "undefined" ? window.location.port : "";
const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "";
const isLocalRuntime = runtimeHost === "localhost" || runtimeHost === "127.0.0.1";
const explicitApiBase = (import.meta.env.VITE_PUBLIC_API_URL || "").trim();
const explicitPointsToLocal =
  explicitApiBase.includes("localhost") || explicitApiBase.includes("127.0.0.1");

const safeExplicitApiBase =
  explicitApiBase && (!explicitPointsToLocal || isLocalRuntime) ? explicitApiBase : "";

const apiBase = safeExplicitApiBase
  ? safeExplicitApiBase
  : isLocalRuntime && runtimePort === "3777"
  ? runtimeOrigin
  : isLocalRuntime
  ? "http://localhost:3000"
  : "";

const normalizedApiBase = apiBase.replace(/\/$/, "").replace(/\/trpc$/, "");
const trpcUrl = `${normalizedApiBase}/trpc`;
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: trpcUrl,
      fetch(url, options) {
        const idToken = getSessionIdToken();
        const signupRole = getSignupRole();
        const mergedHeaders = new Headers(options?.headers ?? {});
        if (idToken) {
          mergedHeaders.set("authorization", `Bearer ${idToken}`);
          mergedHeaders.set("x-teka-id-token", idToken);
        }
        if (signupRole) {
          mergedHeaders.set("x-teka-role", signupRole);
        }
        return fetch(url, {
          ...options,
          headers: mergedHeaders,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
