import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../_schema.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database will not be initialized until it's set.");
}

let pool: ReturnType<typeof mysql.createPool> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

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

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof typeof dbInstance];
  },
});

