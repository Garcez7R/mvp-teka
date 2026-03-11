import * as dotenv from "dotenv";
import { join } from "path";
import { eq } from "drizzle-orm";
import { db } from "./routers/_utils/db.js";
import { sebos } from "./_schema.js";

dotenv.config({ path: join(process.cwd(), ".env") });
dotenv.config({ path: join(process.cwd(), ".env.local") });

function normalizeLocation(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeState(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

async function backfill() {
  console.log("🔧 Iniciando backfill de cidade/UF normalizadas...");
  const rows = await db
    .select({
      id: sebos.id,
      city: sebos.city,
      state: sebos.state,
      cityNormalized: sebos.cityNormalized,
      stateNormalized: sebos.stateNormalized,
    })
    .from(sebos);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const cityNormalized = normalizeLocation(row.city);
    const stateNormalized = normalizeState(row.state);
    const shouldUpdate =
      cityNormalized !== row.cityNormalized || stateNormalized !== row.stateNormalized;
    if (!shouldUpdate) {
      skipped += 1;
      continue;
    }
    await db
      .update(sebos)
      .set({ cityNormalized, stateNormalized })
      .where(eq(sebos.id, row.id));
    updated += 1;
  }

  console.log(`✅ Backfill concluído. Atualizados: ${updated}. Ignorados: ${skipped}.`);
}

backfill().catch((err) => {
  console.error("❌ Falha no backfill:", err);
  process.exit(1);
});
