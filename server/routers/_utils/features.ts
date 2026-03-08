import { getRuntimeEnvValue } from "../../_core/runtime-env.ts";

function readBool(name: string, fallback = false) {
  const raw = String(getRuntimeEnvValue(name) || "").trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function readInt(name: string, fallback: number) {
  const raw = Number.parseInt(String(getRuntimeEnvValue(name) || "").trim(), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export const featureFlags = {
  tiers: () => readBool("FEATURE_TIERS", true),
  reviews: () => readBool("FEATURE_REVIEWS", false),
  publicSeboContact: () => readBool("FEATURE_PUBLIC_SEBO_CONTACT", false),
  enforcePlanLimits: () => readBool("ENFORCE_PLAN_LIMITS", false),
};

export type SeboPlan = "free" | "pro" | "gold";

export function getPlanActiveBooksLimit(plan: SeboPlan) {
  if (plan === "gold") return null;
  if (plan === "pro") return readInt("PLAN_LIMIT_PRO", 1500);
  return readInt("PLAN_LIMIT_FREE", 400);
}
