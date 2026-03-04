import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "../../server/routers/index.js";
import { createTRPCContext } from "../../server/routers/_utils/context.js";

export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext: ({ event }) =>
    createTRPCContext({
      req: {
        headers: event.headers ?? {},
        query: event.queryStringParameters ?? {},
      },
    }),
});
