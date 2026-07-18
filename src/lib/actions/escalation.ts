"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

const transferSchema = z.object({
  transferNumber: z.string().trim().max(30).or(z.literal("")),
  backupNumber: z.string().trim().max(30).or(z.literal("")),
  afterHoursBehavior: z.enum(["take_message", "transfer_anyway", "voicemail"]),
  urgentKeywords: z.string().trim().max(1000).or(z.literal("")),
  vipCallerNumbers: z.string().trim().max(1000).or(z.literal("")),
  failureFallback: z.enum(["take_message", "voicemail", "end_call"]),
  emergencyLanguage: z.string().trim().max(2000).or(z.literal("")),
});

/** Saves the organization's single default transfer + escalation rule set. */
export async function saveTransferRules(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const duringBusinessHoursOnly = formData.get("duringBusinessHoursOnly") === "on";
  const db = await getDb();

  const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const values = {
    transferNumber: d.transferNumber || null,
    backupNumber: d.backupNumber || null,
    duringBusinessHoursOnly,
    afterHoursBehavior: d.afterHoursBehavior,
    urgentKeywords: splitList(d.urgentKeywords),
    vipCallerNumbers: splitList(d.vipCallerNumbers),
    failureFallback: d.failureFallback,
    voicemailFallback: d.failureFallback === "voicemail",
  };

  const existing = await db
    .select({ id: schema.transferRules.id })
    .from(schema.transferRules)
    .where(eq(schema.transferRules.organizationId, ctx.organization.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.transferRules)
      .set(values)
      .where(eq(schema.transferRules.id, existing[0].id));
  } else {
    await db.insert(schema.transferRules).values({
      id: newId("tr"),
      organizationId: ctx.organization.id,
      name: "Default transfer rules",
      ...values,
    });
  }

  // Emergency escalation language is stored as an escalation rule.
  if (d.emergencyLanguage) {
    const existingEsc = await db
      .select({ id: schema.escalationRules.id })
      .from(schema.escalationRules)
      .where(eq(schema.escalationRules.organizationId, ctx.organization.id))
      .limit(1);
    if (existingEsc[0]) {
      await db
        .update(schema.escalationRules)
        .set({ emergencyLanguage: d.emergencyLanguage })
        .where(eq(schema.escalationRules.id, existingEsc[0].id));
    } else {
      await db.insert(schema.escalationRules).values({
        id: newId("esc"),
        organizationId: ctx.organization.id,
        name: "Emergency escalation",
        triggerCondition: "emergency_keyword",
        action: "transfer",
        emergencyLanguage: d.emergencyLanguage,
      });
    }
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "escalation.save",
  });
  revalidatePath("/app/onboarding");
  return { success: "Transfer and escalation rules saved" };
}
