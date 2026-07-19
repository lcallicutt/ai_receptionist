"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

const settingsSchema = z.object({
  textBackMessage: z.string().trim().max(500).or(z.literal("")),
  textBackCooldownHours: z.coerce.number().int().min(1, "Minimum 1 hour").max(720),
});

export async function updateTextBackSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const enabled = formData.get("textBackEnabled") === "on";
  const db = await getDb();

  const existing = await db
    .select({ id: schema.businessProfiles.id })
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.organizationId, ctx.organization.id))
    .limit(1);
  if (!existing[0]) {
    return { error: "Complete your business profile first" };
  }
  await db
    .update(schema.businessProfiles)
    .set({
      textBackEnabled: enabled,
      textBackMessage: parsed.data.textBackMessage || null,
      textBackCooldownHours: parsed.data.textBackCooldownHours,
      updatedAt: new Date(),
    })
    .where(eq(schema.businessProfiles.id, existing[0].id));

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "text_back.update_settings",
    detail: { enabled, cooldownHours: parsed.data.textBackCooldownHours },
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/sms");
  return { success: "Text-back settings saved" };
}
