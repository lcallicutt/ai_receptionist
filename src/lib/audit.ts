import "server-only";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";

/**
 * Writes an audit log entry. Detail must already be PII-safe — never pass
 * credentials, tokens, or raw sensitive payloads.
 */
export async function writeAuditLog(entry: {
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(schema.auditLogs).values({
      id: newId("audit"),
      organizationId: entry.organizationId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      detail: entry.detail ?? null,
    });
  } catch (err) {
    // Audit failures must never break the user-facing operation.
    console.error("audit-log write failed", { action: entry.action, err });
  }
}
