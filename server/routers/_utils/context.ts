import type { User } from "../../_schema.ts";

export type Context = {
  user: User | null;
  userId: number | null;
};

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  cookies?: Record<string, string | undefined>;
};

type ContextOptionsLike = {
  req?: RequestLike;
};

function readFirstValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return null;
}

export async function createTRPCContext(
  opts?: ContextOptionsLike
): Promise<Context> {
  const req = opts?.req;
  const isProduction = process.env.NODE_ENV === "production";

  // Prefer explicit headers/cookies. In production, do not trust query params.
  const fromHeader = readFirstValue(req?.headers?.["x-user-id"]);
  const fromCookie = req?.cookies?.userId ?? null;
  const fromQuery = !isProduction ? readFirstValue(req?.query?.userId) : null;
  const rawUserId = fromHeader ?? fromCookie ?? fromQuery;
  const parsedUserId = rawUserId ? Number.parseInt(rawUserId, 10) : NaN;
  const userId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

  return {
    user: null, // Will be populated with actual auth
    userId,
  };
}
