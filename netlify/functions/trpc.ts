import type { Handler } from "@netlify/functions";
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

function buildRequestUrl(event: NetlifyEvent): string {
  if (event.rawUrl) return event.rawUrl;

  const host = event.headers?.host ?? event.headers?.Host ?? "localhost";
  const protocol = host.includes("localhost") ? "http" : "https";
  const url = new URL(`${protocol}://${host}${event.path}`);

  for (const [key, value] of Object.entries(event.queryStringParameters ?? {})) {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export const handler: Handler = async (event) => {
  try {
    const netlifyEvent = event as unknown as NetlifyEvent;
    const requestUrl = buildRequestUrl(netlifyEvent);
    const pathname = new URL(requestUrl).pathname;
    const endpoint = pathname.startsWith("/.netlify/functions/trpc")
      ? "/.netlify/functions/trpc"
      : "/trpc";
    const body =
      netlifyEvent.isBase64Encoded && netlifyEvent.body
        ? Buffer.from(netlifyEvent.body, "base64").toString("utf-8")
        : netlifyEvent.body;

    const request = new Request(requestUrl, {
      method: netlifyEvent.httpMethod,
      headers: netlifyEvent.headers,
      body:
        netlifyEvent.httpMethod === "GET" || netlifyEvent.httpMethod === "HEAD"
          ? undefined
          : body ?? undefined,
    });

    const response = await fetchRequestHandler({
      endpoint,
      req: request,
      router: appRouter,
      createContext: () =>
        createTRPCContext({
          req: {
            headers: netlifyEvent.headers ?? {},
            query: netlifyEvent.queryStringParameters ?? {},
          },
        }),
    });

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        error: "TRPC_FUNCTION_ERROR",
        message,
      }),
    };
  }
};
