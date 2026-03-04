import type { Handler } from "@netlify/functions";
import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "../../server/routers/index.js";
import { createTRPCContext } from "../../server/routers/_utils/context.js";

const trpcLambdaHandler = awsLambdaRequestHandler({
  router: appRouter,
  createContext: ({ event }) =>
    createTRPCContext({
      req: {
        headers: (event.headers ?? {}) as Record<string, string | undefined>,
        query: (event.queryStringParameters ?? {}) as Record<string, unknown>,
      },
    }),
});

function normalizeEvent(event: any) {
  const headers = event?.headers ?? {};
  const httpMethod = event?.httpMethod ?? event?.requestContext?.http?.method ?? "GET";
  const host = headers.host ?? headers.Host ?? "localhost";

  // tRPC aws adapter reads `event.requestContext.domainName`.
  const requestContext = {
    ...(event?.requestContext ?? {}),
    domainName: event?.requestContext?.domainName ?? host,
    http: {
      ...(event?.requestContext?.http ?? {}),
      method: httpMethod,
    },
  };

  return {
    ...event,
    headers,
    httpMethod,
    requestContext,
    version: event?.version ?? "1.0",
  };
}

export const handler: Handler = async (event, context) => {
  const safeEvent = normalizeEvent(event);
  return trpcLambdaHandler(safeEvent as any, context as any);
};
