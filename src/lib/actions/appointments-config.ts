"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import type { ActionState } from "./business";

const typeSchema = z.object({
  id: z.string().trim().max(64).or(z.literal("")),
  name: z.string().trim().min(1, "Appointment type name is required").max(200),
  durationMinutes: z.coerce.number().int().min(5, "Minimum 5 minutes").max(480),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  minNoticeHours: z.coerce.number().int().min(0).max(720),
  location: z.string().trim().max(300).or(z.literal("")),
  virtualMeetingLink: z.string().trim().url("Enter a valid URL").max(500).or(z.literal("")),
  confirmationMessage: z.string().trim().max(1000).or(z.literal("")),
  reminderMessage: z.string().trim().max(1000).or(z.literal("")),
});

export async function upsertAppointmentType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const parsed = typeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const db = await getDb();

  const values = {
    name: d.name,
    durationMinutes: d.durationMinutes,
    bufferMinutes: d.bufferMinutes,
    minNoticeHours: d.minNoticeHours,
    location: d.location || null,
    virtualMeetingLink: d.virtualMeetingLink || null,
    confirmationMessage: d.confirmationMessage || null,
    reminderMessage: d.reminderMessage || null,
  };

  if (d.id) {
    const result = await db
      .update(schema.appointmentTypes)
      .set(values)
      .where(
        and(
          eq(schema.appointmentTypes.id, d.id),
          eq(schema.appointmentTypes.organizationId, ctx.organization.id),
        ),
      )
      .returning();
    if (result.length === 0) return { error: "Appointment type not found" };
  } else {
    await db.insert(schema.appointmentTypes).values({
      id: newId("at"),
      organizationId: ctx.organization.id,
      ...values,
    });
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: d.id ? "appointment_type.update" : "appointment_type.create",
  });
  revalidatePath("/app/onboarding");
  revalidatePath("/app/appointments");
  return { success: d.id ? "Appointment type updated" : "Appointment type added" };
}

export async function deleteAppointmentType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing appointment type" };
  const db = await getDb();
  const result = await db
    .delete(schema.appointmentTypes)
    .where(
      and(
        eq(schema.appointmentTypes.id, id),
        eq(schema.appointmentTypes.organizationId, ctx.organization.id),
      ),
    )
    .returning();
  if (result.length === 0) return { error: "Appointment type not found" };
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "appointment_type.delete",
    entityId: id,
  });
  revalidatePath("/app/onboarding");
  return { success: "Appointment type deleted" };
}
