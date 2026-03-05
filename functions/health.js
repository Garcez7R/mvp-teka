function normalizeUpstream(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

export async function onRequest(context) {
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

  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}
