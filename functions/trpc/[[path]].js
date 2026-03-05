function normalizeUpstream(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function buildUpstreamUrl(requestUrl, upstreamBase) {
  const incoming = new URL(requestUrl);
  const base = normalizeUpstream(upstreamBase);
  if (!base) {
    throw new Error("TRPC_UPSTREAM_URL is not configured");
  }

  const incomingPath = incoming.pathname.replace(/^\/trpc/, "");
  const baseHasTrpc = /\/trpc$/i.test(base);
  const targetPath = baseHasTrpc ? incomingPath : `/trpc${incomingPath}`;
  return `${base}${targetPath}${incoming.search}`;
}

export async function onRequest(context) {
  const upstreamUrl = buildUpstreamUrl(
    context.request.url,
    context.env.TRPC_UPSTREAM_URL || context.env.API_UPSTREAM_URL
  );

  const headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("x-forwarded-host");
  headers.delete("x-real-ip");

  const upstreamRequest = new Request(upstreamUrl, {
    method: context.request.method,
    headers,
    body:
      context.request.method === "GET" || context.request.method === "HEAD"
        ? undefined
        : context.request.body,
    redirect: "follow",
  });

  const upstreamResponse = await fetch(upstreamRequest);
  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.set("cache-control", "no-store");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
