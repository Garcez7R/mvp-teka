import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers/index.js";
import { createTRPCContext } from "../../server/routers/_utils/context.js";

type NetlifyEvent = {
  httpMethod: string;
  path: string;
  rawUrl?: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
};

function buildRawUrl(event: NetlifyEvent): string {
  if (event.rawUrl) return event.rawUrl;
  const host = event.headers?.host || "localhost";
  const url = new URL(`https://${host}${event.path}`);
  const query = event.queryStringParameters ?? {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export const handler = async (event: NetlifyEvent) => {
  const body = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;

  const request = new Request(buildRawUrl(event), {
    method: event.httpMethod,
    headers: event.headers,
    body: event.httpMethod === "GET" || event.httpMethod === "HEAD" ? undefined : body ?? undefined,
  });

  const response = await fetchRequestHandler({
    endpoint: "/.netlify/functions/trpc",
    req: request,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        req: {
          headers: event.headers ?? {},
          query: event.queryStringParameters ?? {},
        },
      }),
  });

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
};
