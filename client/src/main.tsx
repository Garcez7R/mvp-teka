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
// - Local dev: Express server on localhost:3000
// - Vercel: same-origin /trpc rewrite to /api/trpc
// - Netlify: direct function endpoint /.netlify/functions/trpc
const isNetlifyRuntime =
  typeof window !== "undefined" && window.location.hostname.includes("netlify");
const isLocalExpressRuntime =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  window.location.port === "3777";
const apiBase = import.meta.env.VITE_PUBLIC_API_URL
  ? import.meta.env.VITE_PUBLIC_API_URL
  : import.meta.env.PROD
  ? isNetlifyRuntime
    ? "/.netlify/functions"
    : ""
  : isLocalExpressRuntime
  ? window.location.origin
  : "http://localhost:3000";

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
