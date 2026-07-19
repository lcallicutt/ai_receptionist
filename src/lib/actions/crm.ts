"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgContext, requireOrgRole, requirePlatformAdmin } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { encryptCredentials } from "@/lib/crypto";
import { GoHighLevelProvider } from "@/lib/providers/crm/gohighlevel";
import { WebhookCrmProvider } from "@/lib/providers/crm/webhook";
import { syncLeadToCrm } from "@/lib/crm-sync";
import type { ActionState } from "./business";

async function upsertConnection(
  organizationId: string,
  values: Partial<typeof schema.crmConnections.$inferInsert> & { provider: string },
): Promise<void> {
  const db = await getDb();
  const existing = await db
    .select({ id: schema.crmConnections.id })
    .from(schema.crmConnections)
    .where(eq(schema.crmConnections.organizationId, organizationId))
    .limit(1);
  if (existing[0]) {
    await db.update(schema.crmConnections).set(values).where(eq(schema.crmConnections.id, existing[0].id));
  } else {
    await db.insert(schema.crmConnections).values({
      id: newId("crm"),
      organizationId,
      ...values,
    });
  }
}

const ghlSchema = z.object({
  apiKey: z.string().trim().min(10, "Enter your GoHighLevel API key"),
});

export async function connectGoHighLevel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = ghlSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  // Validate the key before storing it.
  try {
    await new GoHighLevelProvider(parsed.data.apiKey).testConnection();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "GoHighLevel connection failed" };
  }

  await upsertConnection(ctx.organization.id, {
    provider: "gohighlevel",
    label: "GoHighLevel",
    encryptedCredentials: encryptCredentials({ apiKey: parsed.data.apiKey }),
    webhookUrl: null,
    status: "connected",
    lastSyncedAt: new Date(),
  });
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "crm.connect",
    detail: { provider: "gohighlevel" },
  });
  revalidatePath("/app/crm");
  return { success: "GoHighLevel connected" };
}

const webhookSchema = z.object({
  webhookUrl: z.string().trim().url("Enter a valid HTTPS URL").max(1000),
  secret: z.string().trim().max(200).or(z.literal("")),
});

export async function connectWebhookCrm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = webhookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  if (!parsed.data.webhookUrl.startsWith("https://")) {
    return { error: "Webhook URL must use HTTPS" };
  }

  try {
    await new WebhookCrmProvider(
      parsed.data.webhookUrl,
      parsed.data.secret || null,
    ).testConnection();
  } catch (err) {
    return {
      error: `Test delivery failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  await upsertConnection(ctx.organization.id, {
    provider: "webhook",
    label: "Webhook CRM",
    webhookUrl: parsed.data.webhookUrl,
    encryptedCredentials: parsed.data.secret
      ? encryptCredentials({ secret: parsed.data.secret })
      : null,
    status: "connected",
    lastSyncedAt: new Date(),
  });
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "crm.connect",
    detail: { provider: "webhook" },
  });
  revalidatePath("/app/crm");
  return { success: "Webhook CRM connected — a signed test event was delivered" };
}

export async function disconnectCrm(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("connectionId") ?? "");
  if (!id) return { error: "Missing connection" };
  const db = await getDb();
  const result = await db
    .update(schema.crmConnections)
    .set({ status: "disconnected", encryptedCredentials: null })
    .where(
      and(
        eq(schema.crmConnections.id, id),
        eq(schema.crmConnections.organizationId, ctx.organization.id),
      ),
    )
    .returning();
  if (result.length === 0) return { error: "Connection not found" };
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "crm.disconnect",
    entityId: id,
  });
  revalidatePath("/app/crm");
  return { success: "CRM disconnected" };
}

/** Manual resync for a single lead (client portal). */
export async function resyncLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const leadId = String(formData.get("leadId") ?? "");
  if (!leadId) return { error: "Missing lead" };
  const outcome = await syncLeadToCrm(ctx.organization.id, leadId);
  revalidatePath(`/app/leads/${leadId}`);
  revalidatePath("/app/leads");
  if (outcome.status === "synced") return { success: "Lead synced to CRM" };
  if (outcome.status === "skipped") return { error: `Sync skipped: ${outcome.reason}` };
  return { error: `Sync failed: ${outcome.error}` };
}

/** Platform-admin retry for any tenant's failed lead sync (support tooling). */
export async function adminRetryCrmSync(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requirePlatformAdmin();
  const leadId = String(formData.get("leadId") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!leadId || !organizationId) return { error: "Missing lead" };
  const outcome = await syncLeadToCrm(organizationId, leadId);
  await writeAuditLog({
    organizationId,
    actorUserId: admin.id,
    action: "crm.admin_retry",
    entityId: leadId,
    detail: { outcome: outcome.status },
  });
  revalidatePath("/admin/failed-workflows");
  if (outcome.status === "synced") return { success: "Lead synced" };
  if (outcome.status === "skipped") return { error: `Skipped: ${outcome.reason}` };
  return { error: `Failed again: ${outcome.error}` };
}
