import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

import express, { type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers/index.js";
import { createTRPCContext } from "../routers/_utils/context.js";

const app = express();
const PORT = process.env.PORT || 3777;
app.set("trust proxy", true);

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function createRateLimiter(pathPrefix: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: () => void) => {
    if (!req.path.startsWith(pathPrefix)) {
      next();
      return;
    }

    const now = Date.now();
    const sourceIp =
      req.ip ||
      req.socket.remoteAddress ||
      String(req.headers["x-forwarded-for"] || "unknown");
    const key = `${pathPrefix}:${sourceIp}`;
    const current = rateBuckets.get(key);

    if (!current || now >= current.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      res.header("X-RateLimit-Limit", String(maxRequests));
      res.header("X-RateLimit-Remaining", String(maxRequests - 1));
      next();
      return;
    }

    const remaining = Math.max(0, maxRequests - current.count);
    res.header("X-RateLimit-Limit", String(maxRequests));
    res.header("X-RateLimit-Remaining", String(remaining));

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.header("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    current.count += 1;
    rateBuckets.set(key, current);
    res.header("X-RateLimit-Remaining", String(Math.max(0, maxRequests - current.count)));
    next();
  };
}

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(createRateLimiter("/trpc", 120, 60_000));
app.use(createRateLimiter("/health", 30, 60_000));
app.use((req: Request, res: Response, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.path.startsWith("/trpc")) {
    res.header("Cache-Control", "no-store");
  }
  next();
});

// CORS
app.use((req: Request, res: Response, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, trpc-batch, x-teka-id-token, x-teka-role"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// tRPC
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  })
);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files from client
const clientDistPath = path.resolve(__dirname, "../../dist/public");
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
