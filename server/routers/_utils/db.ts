import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../_schema.ts";
import * as dotenv from "dotenv";
import { join } from "path";

// Tenta carregar o .env e o .env.local de forma absoluta
dotenv.config({ path: join(process.cwd(), ".env") });
dotenv.config({ path: join(process.cwd(), ".env.local") });

let pool: ReturnType<typeof mysql.createPool> | null = null;
let dbInstance: any = null;

/**
 * Busca a URL de conexão em diferentes nomes de variáveis de ambiente
 */
function getConnectionString() {
  const possibleNames = [
    "DATABASE_URL",
    "database_url",
    "DB_URL",
    "db_url",
    "MYSQL_URL",
    "mysql_url",
    "DATABASE_URL_MYSQL"
  ];

  for (const name of possibleNames) {
    if (process.env[name]) {
      return process.env[name];
    }
  }
  return null;
}

function initializePool() {
  if (pool) return pool;
  
  const connStr = getConnectionString();
  
  if (!connStr) {
    console.error("\n❌ ERRO: Não foi possível encontrar a URL de conexão com o banco de dados.");
    console.error("👉 Verifique se o seu arquivo .env ou .env.local contém a variável DATABASE_URL.");
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
