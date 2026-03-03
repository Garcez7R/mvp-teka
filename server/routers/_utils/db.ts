import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../_schema.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database will not be initialized until it's set.");
}

let pool: ReturnType<typeof mysql.createPool> | null = null;
// drizzle return type gets generic schema; we just hold `any` here to avoid mismatches
let dbInstance: any = null;

function initializePool() {
  if (pool) return pool;
  
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error("DATABASE_URL is required");
  }

  pool = mysql.createPool({
    uri: connStr,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

export function getDb() {
  if (!dbInstance) {
    const p = initializePool();
    dbInstance = drizzle(p, { schema, mode: "default" });
  }
  return dbInstance;
}

export const db = new Proxy({} as any, {
  get(target, prop) {
    const inst = getDb();
    return inst[prop as keyof typeof inst];
  },
});

