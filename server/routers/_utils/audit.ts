import { db } from "./db.js";
import { auditLogs } from "../../_schema.ts";

type AuditInput = {
  actorUserId?: number | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown> | null;
};

export async function logAuditEvent(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId:
        input.entityId === undefined || input.entityId === null
          ? null
          : String(input.entityId),
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  } catch {
    // Fail-open: auditoria nunca pode derrubar fluxo principal.
  }
}

