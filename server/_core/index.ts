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
app.use(createRateLimiter("/api/ocr", 20, 60_000));
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

app.post("/api/ocr", async (req: Request, res: Response) => {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  const imageDataUrl = String(req.body?.image || "").trim();

  if (!apiKey) {
    return res.status(503).json({ error: "OCR service is not configured." });
  }

  if (!imageDataUrl.startsWith("data:image/")) {
    return res.status(400).json({ error: "Invalid image payload." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const form = new FormData();
    form.append("apikey", apiKey);
    form.append("language", "eng");
    form.append("isOverlayRequired", "false");
    form.append("isCreateSearchablePdf", "false");
    form.append("OCREngine", "2");
    form.append("scale", "true");
    form.append("base64Image", imageDataUrl);

    const upstream = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: "OCR upstream request failed." });
    }

    const payload = await upstream.json();
    const parsedResults = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : [];
    const text = parsedResults
      .map((item: any) => String(item?.ParsedText || ""))
      .join("\n")
      .trim();

    if (!text) {
      return res.status(422).json({ error: "No text extracted from image." });
    }

    return res.json({ text });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return res.status(isAbort ? 504 : 500).json({
      error: isAbort ? "OCR request timed out." : "OCR request failed.",
    });
  } finally {
    clearTimeout(timeout);
  }
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
