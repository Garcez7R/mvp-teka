import { createRoot } from "react-dom/client";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { trpc } from "./lib/trpc";
import { getSessionUserId } from "./lib/session";
import "./index.css";

function cleanupLegacyServiceWorkers() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  void (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        const legacyKeys = cacheKeys.filter(
          (key) => key === "teka-v1" || key.startsWith("teka-")
        );
        await Promise.all(legacyKeys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.warn("Falha ao limpar service workers legados:", error);
    }
  })();
}

cleanupLegacyServiceWorkers();

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
        const sessionUserId = getSessionUserId();
        const mergedHeaders = new Headers(options?.headers ?? {});
        if (sessionUserId) {
          mergedHeaders.set("x-user-id", String(sessionUserId));
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
