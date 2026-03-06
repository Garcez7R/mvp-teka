function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function runOcr({ imageDataUrl, apiKey, timeoutMs = 8000 }) {
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

  const result = await runOcr({ imageDataUrl, apiKey, timeoutMs: 8000 });
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
    },
  });
}
