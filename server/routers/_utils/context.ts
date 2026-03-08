import type { User } from "../../_schema.ts";
import { db } from "./db.js";
import { users } from "../../_schema.ts";
import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getRuntimeEnvValue } from "../../_core/runtime-env.ts";

export type Context = {
  user: User | null;
  userId: number | null;
  role: User["role"] | null;
};

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

type ContextOptionsLike = {
  req?: RequestLike;
};

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);
const BUILTIN_ADMIN_EMAILS = new Set([
  "rgs.dba7@gmail.com",
  "claudiasobralm@gmail.com",
  "carlosdanielbp101@gmail.com",
  "dianadasilv4ds@gmail.com",
]);

function readFirstValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  return null;
}

function getAdminEmailsAllowlist(): Set<string> {
  const raw = getRuntimeEnvValue("ADMIN_EMAILS") ?? "";
  const fromEnv = raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...Array.from(BUILTIN_ADMIN_EMAILS), ...fromEnv]);
}

function getGoogleAudiencesAllowlist(): string[] {
  const values = [
    getRuntimeEnvValue("GOOGLE_CLIENT_ID"),
    getRuntimeEnvValue("VITE_GOOGLE_CLIENT_ID"),
    getRuntimeEnvValue("GOOGLE_CLIENT_IDS"),
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

export async function createTRPCContext(
  opts?: ContextOptionsLike
): Promise<Context> {
  const req = opts?.req;

  const authHeader =
    readFirstValue(req?.headers?.authorization) ??
    readFirstValue(req?.headers?.Authorization);
  const idTokenHeader =
    readFirstValue(req?.headers?.["x-teka-id-token"]) ??
    readFirstValue(req?.headers?.["X-Teka-Id-Token"]);
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : idTokenHeader;

  if (bearerToken) {
    try {
      const audiences = getGoogleAudiencesAllowlist();
      if (audiences.length === 0) {
        throw new Error("GOOGLE_CLIENT_ID (or VITE_GOOGLE_CLIENT_ID) is required");
      }

      const issuer = ["https://accounts.google.com", "accounts.google.com"];
      let verified: Awaited<ReturnType<typeof jwtVerify>> | null = null;
      let lastError: unknown = null;

      for (const audience of audiences) {
        try {
          verified = await jwtVerify(bearerToken, googleJwks, {
            audience,
            issuer,
          });
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!verified) {
        throw lastError instanceof Error ? lastError : new Error("Google token verification failed");
      }

      const payload: any = verified.payload;

      const googleSub = payload.sub;
      const email = typeof payload.email === "string" ? payload.email : null;
      const normalizedEmail = email?.trim().toLowerCase() ?? null;
      const name = typeof payload.name === "string" ? payload.name : null;
      const requestedRole = readFirstValue(req?.headers?.["x-teka-role"]);
      const adminEmailAllowlist = getAdminEmailsAllowlist();
      const isAdminEmail = Boolean(
        normalizedEmail && adminEmailAllowlist.has(normalizedEmail)
      );
      const initialRole =
        isAdminEmail
          ? "admin"
          : 
        requestedRole === "livreiro" || requestedRole === "comprador"
          ? requestedRole
          : "comprador";

      if (googleSub && email) {
        const openId = `google:${googleSub}`;
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .then((res: Array<typeof users.$inferSelect>) => res[0] ?? null);

        if (existing) {
          const shouldPromoteToLivreiro =
            requestedRole === "livreiro" &&
            (existing.role === "comprador" || existing.role === "user");
          const effectiveRole = isAdminEmail
            ? "admin"
            : shouldPromoteToLivreiro
            ? "livreiro"
            : existing.role;

          await db
            .update(users)
            .set({
              name: name ?? existing.name,
              email: email ?? existing.email,
              role: effectiveRole,
              loginMethod: "google",
              lastSignedIn: new Date(),
            })
            .where(eq(users.id, existing.id));

          return {
            user: {
              ...existing,
              name: name ?? existing.name,
              email: email ?? existing.email,
              role: effectiveRole,
            },
            userId: existing.id,
            role: effectiveRole,
          };
        }

        const created = await db
          .insert(users)
          .values({
            openId,
            name,
            email,
            role: initialRole,
            loginMethod: "google",
          })
          .returning({ id: users.id });

        const createdUser = await db
          .select()
          .from(users)
          .where(eq(users.id, created[0].id))
          .then((res: Array<typeof users.$inferSelect>) => res[0] ?? null);

        if (createdUser) {
          return {
            user: createdUser,
            userId: createdUser.id,
            role: createdUser.role,
          };
        }
      }
    } catch {
      // Invalid or expired Google token: fallback to anonymous context.
    }
  }

  return {
    user: null,
    userId: null,
    role: null,
  };
}
