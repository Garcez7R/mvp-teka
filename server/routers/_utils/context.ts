import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type Context = {
  user: User | null;
  userId: number | null;
};

export async function createTRPCContext(
  opts?: CreateExpressContextOptions
): Promise<Context> {
  // Extract user from request (you'll update this with actual auth logic)
  const authHeader = opts?.req?.headers?.authorization;
  const userId = opts?.req?.query?.userId
    ? parseInt(opts.req.query.userId as string)
    : null;

  return {
    user: null, // Will be populated with actual auth
    userId,
  };
}
