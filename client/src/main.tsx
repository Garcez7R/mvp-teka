import { createRoot } from "react-dom/client";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { trpc } from "./lib/trpc";
import { getSessionIdToken, getSignupRole } from "./lib/session";
import "./index.css";

function disableServiceWorkerAndClearLocalCaches() {
  if (typeof window === "undefined") {
    return;
  }

  void (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch (error) {
      console.warn("Falha ao limpar Service Worker/cache:", error);
    }
  })();
}

disableServiceWorkerAndClearLocalCaches();

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      window.location.reload();
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60 * 10,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
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
