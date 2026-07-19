"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { getOrgPlanTier } from "@/lib/subscription";
import { planLimit, planLimitReached, PLAN_DEFINITIONS } from "@/lib/plans";
import type { ActionState } from "./business";

const recipientSchema = z
  .object({
    id: z.string().trim().max(64).or(z.literal("")),
    recipientName: z.string().trim().min(1, "Recipient name is required").max(200),
    recipientEmail: z.string().trim().email("Enter a valid email").max(320).or(z.literal("")),
    recipientPhone: z.string().trim().max(30).or(z.literal("")),
  })
  .refine((d) => d.recipientEmail || d.recipientPhone, {
    message: "Provide an email or a phone number",
  });

const TOGGLE_KEYS = [
  "callSummaryEmail",
  "callSummarySms",
  "crmNotification",
  "highPriorityLeadAlert",
  "appointmentAlert",
  "failedBookingAlert",
  "missedTransferAlert",
  "dailyDigest",
  "weeklySummary",
] as const;

export async function upsertNotificationRecipient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = recipientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const db = await getDb();

  const toggles = Object.fromEntries(
    TOGGLE_KEYS.map((k) => [k, formData.get(k) === "on"]),
  ) as Record<(typeof TOGGLE_KEYS)[number], boolean>;

  if (!d.id) {
    // Server-side plan enforcement: recipient count is capped by plan.
    const tier = await getOrgPlanTier(ctx.organization.id);
    const current = await db
      .select({ n: count() })
      .from(schema.notificationSettings)
      .where(eq(schema.notificationSettings.organizationId, ctx.organization.id));
    if (planLimitReached(tier, "notification_recipients", current[0]?.n ?? 0)) {
      const cap = planLimit(tier, "notification_recipients");
      return {
        error: `Your ${PLAN_DEFINITIONS[tier].name} plan allows ${cap} notification recipient${cap === 1 ? "" : "s"}. Upgrade to add more.`,
      };
    }
    await db.insert(schema.notificationSettings).values({
      id: newId("ns"),
      organizationId: ctx.organization.id,
      recipientName: d.recipientName,
      recipientEmail: d.recipientEmail || null,
      recipientPhone: d.recipientPhone || null,
      ...toggles,
    });
  } else {
    const result = await db
      .update(schema.notificationSettings)
      .set({
        recipientName: d.recipientName,
        recipientEmail: d.recipientEmail || null,
        recipientPhone: d.recipientPhone || null,
        ...toggles,
      })
      .where(
        and(
          eq(schema.notificationSettings.id, d.id),
          eq(schema.notificationSettings.organizationId, ctx.organization.id),
        ),
      )
      .returning();
    if (result.length === 0) return { error: "Recipient not found" };
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: d.id ? "notifications.update_recipient" : "notifications.add_recipient",
  });
  revalidatePath("/app/notifications");
  revalidatePath("/app/onboarding");
  return { success: d.id ? "Recipient updated" : "Recipient added" };
}

export async function deleteNotificationRecipient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing recipient" };
  const db = await getDb();
  const result = await db
    .delete(schema.notificationSettings)
    .where(
      and(
        eq(schema.notificationSettings.id, id),
        eq(schema.notificationSettings.organizationId, ctx.organization.id),
      ),
    )
    .returning();
  if (result.length === 0) return { error: "Recipient not found" };
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "notifications.delete_recipient",
    entityId: id,
  });
  revalidatePath("/app/notifications");
  return { success: "Recipient removed" };
}
