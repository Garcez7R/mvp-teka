function normalizeUpstream(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

export async function onRequest(context) {
  const mode = (context.env.TRPC_EXECUTION_MODE || "proxy").toLowerCase();
  if (mode === "local") {
    return Response.json(
      {
        status: "ok",
        mode: "local",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
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
  };

  return new Response(text, {
    status: res.status,
    headers,
  });
}
