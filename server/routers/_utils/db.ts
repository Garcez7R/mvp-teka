import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "../../_schema.ts";
import { getRuntimeEnvBinding } from "../../_core/runtime-env.ts";

type D1DatabaseLike = { prepare: (query: string) => unknown };

function isD1DatabaseLike(value: unknown): value is D1DatabaseLike {
  return Boolean(value && typeof (value as D1DatabaseLike).prepare === "function");
}

function createDb() {
  const runtimeDb = getRuntimeEnvBinding("DB");
  if (!isD1DatabaseLike(runtimeDb)) {
    throw new Error(
      "D1 binding 'DB' is required. Configure DB in Cloudflare Pages > Settings > Bindings."
    );
  }
  return drizzleD1(runtimeDb as any, { schema: schema as any });
}

export const db = createDb();

export function getDb() {
  return db;
}

