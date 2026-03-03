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
// Determine the API root depending on environment.
// In local dev we talk to localhost:3000, in production we let Vercel handle
// the routing via `/api` prefix. The VITE_PUBLIC_API_URL override can be used
// when running on a custom domain or during preview deployments.
const apiBase = import.meta.env.VITE_PUBLIC_API_URL
  ? import.meta.env.VITE_PUBLIC_API_URL
  : import.meta.env.PROD
  ? "/trpc"
  : "http://localhost:3000";
// note: when apiBase is "/trpc" above we will end up requesting "/trpc/trpc" which
// is not desirable, so we override below when building the link



// We want the final endpoint to be `/trpc` regardless of
// apiBase.  If apiBase already ends with `/trpc` we avoid adding it twice.
const trpcUrl = apiBase.replace(/\/trpc$/, "") + "/trpc";
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
