const ocrRateBuckets = new Map();

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  );
}

function isRateLimited(ip, maxRequests = 15, windowMs = 60_000) {
  const now = Date.now();
  const current = ocrRateBuckets.get(ip);
  if (!current || now >= current.resetAt) {
    ocrRateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (current.count >= maxRequests) {
    return true;
  }
  current.count += 1;
  ocrRateBuckets.set(ip, current);
  return false;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(self), microphone=(), geolocation=()",
    },
  });
}

async function runOcr({ imageDataUrl, apiKey, timeoutMs = 20000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
      return { ok: false, status: 502, error: "OCR upstream request failed." };
    }

    const payload = await upstream.json();
    const parsedResults = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : [];
    const text = parsedResults
      .map((item) => String(item?.ParsedText || ""))
      .join("\n")
      .trim();

    if (!text) {
      return { ok: false, status: 422, error: "No text extracted from image." };
    }

    return { ok: true, text };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: timeout ? 504 : 500,
      error: timeout ? "OCR request timed out." : "OCR request failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestPost(context) {
  const apiKey = String(context.env.OCR_SPACE_API_KEY || "").trim();
  if (!apiKey) {
    return json({ error: "OCR service is not configured." }, 503);
  }

  const ip = getClientIp(context.request);
  if (isRateLimited(ip)) {
    return json({ error: "Too many OCR requests. Please try again shortly." }, 429);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON payload." }, 400);
  }

  const imageDataUrl = String(body?.image || "").trim();
  if (!imageDataUrl.startsWith("data:image/")) {
    return json({ error: "Invalid image payload." }, 400);
  }
  if (imageDataUrl.length > 12_000_000) {
    return json({ error: "Image too large for OCR." }, 413);
  }

  const result = await runOcr({ imageDataUrl, apiKey, timeoutMs: 20000 });
  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }

  return json({ text: result.text }, 200);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: "POST, OPTIONS",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}
