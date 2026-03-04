import { createRoot } from "react-dom/client";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { trpc } from "./lib/trpc";
import "./index.css";

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

// Create tRPC client
// - Hosted environments (Vercel/Netlify/custom): same-origin /trpc
// - Local Express (3777): same-origin /trpc
// - Vite dev (5173): backend on localhost:3000
const runtimeHost = typeof window !== "undefined" ? window.location.hostname : "";
const runtimePort = typeof window !== "undefined" ? window.location.port : "";
const runtimeOrigin = typeof window !== "undefined" ? window.location.origin : "";
const isLocalRuntime = runtimeHost === "localhost" || runtimeHost === "127.0.0.1";
const explicitApiBase = (import.meta.env.VITE_PUBLIC_API_URL || "").trim();
const explicitPointsToLocal =
  explicitApiBase.includes("localhost") || explicitApiBase.includes("127.0.0.1");

// Avoid broken public deploys caused by env values like localhost in Netlify/Vercel.
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
        return fetch(url, {
          ...options,
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
