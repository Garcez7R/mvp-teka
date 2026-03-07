function normalizeUpstream(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

export async function onRequest(context) {
  const mode = (context.env.TRPC_EXECUTION_MODE || "local").toLowerCase();
  if (mode === "local") {
    return Response.json(
      {
        status: "ok",
        mode: "local",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      }
    );
  }

  const base = normalizeUpstream(
    context.env.API_UPSTREAM_URL || context.env.TRPC_UPSTREAM_URL || ""
  );

  if (!base) {
    return Response.json(
      {
        status: "error",
        message: "API_UPSTREAM_URL not configured",
      },
      { status: 500 }
    );
  }

  const healthUrl = `${base.replace(/\/trpc$/i, "")}/health`;
  const res = await fetch(healthUrl, { method: "GET" });
  const text = await res.text();
  const headers = {
    "content-type": res.headers.get("content-type") || "application/json",
    "x-teka-trpc-mode": "proxy",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
  };

  return new Response(text, {
    status: res.status,
    headers,
  });
}
