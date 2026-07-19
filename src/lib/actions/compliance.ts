"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

const complianceSchema = z.object({
  recordingDisclosure: z.string().trim().max(1000).or(z.literal("")),
  recordingRetentionDays: z.coerce.number().int().min(1).max(3650),
  transcriptRetentionDays: z.coerce.number().int().min(1).max(3650),
  legalDisclaimer: z.string().trim().max(2000).or(z.literal("")),
});

export async function updateComplianceSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("owner");
  const parsed = complianceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const recordingEnabled = formData.get("recordingEnabled") === "on";
  if (recordingEnabled && !parsed.data.recordingDisclosure) {
    return { error: "A recording disclosure is required when recording is enabled" };
  }
  const db = await getDb();

  const values = {
    recordingEnabled,
    recordingDisclosure: parsed.data.recordingDisclosure || null,
    recordingRetentionDays: parsed.data.recordingRetentionDays,
    transcriptRetentionDays: parsed.data.transcriptRetentionDays,
    legalDisclaimer: parsed.data.legalDisclaimer || null,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: schema.dataRetentionSettings.id })
    .from(schema.dataRetentionSettings)
    .where(eq(schema.dataRetentionSettings.organizationId, ctx.organization.id))
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.dataRetentionSettings)
      .set(values)
      .where(eq(schema.dataRetentionSettings.id, existing[0].id));
  } else {
    await db.insert(schema.dataRetentionSettings).values({
      id: newId("drs"),
      organizationId: ctx.organization.id,
      ...values,
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "compliance.update_settings",
    detail: { recordingEnabled },
  });
  revalidatePath("/app/compliance");
  return { success: "Compliance settings saved" };
}

/** Records a data-deletion request for a caller phone number (workflow entry). */
export async function requestDataDeletion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("owner");
  const phone = String(formData.get("phone") ?? "").trim();
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return { error: "Enter the caller's number in E.164 format, e.g. +19105551234" };
  }
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "compliance.deletion_request",
    detail: { phoneLast4: phone.slice(-4) },
  });
  return {
    success:
      "Deletion request recorded. FlowNet support processes verified requests — calls, transcripts, and lead data for this caller will be purged per your retention policy.",
  };
}
