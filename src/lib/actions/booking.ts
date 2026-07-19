"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, lte, gte } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import { requireOrgContext, requireOrgRole } from "@/lib/auth/guards";
import { writeAuditLog } from "@/lib/audit";
import { getCalendarProviders } from "@/lib/providers/calendar";
import { renderTemplate } from "@/lib/booking";
import type { ActionState } from "./business";

const bookSchema = z.object({
  appointmentTypeId: z.string().min(1, "Choose an appointment type"),
  slotStart: z.string().min(1, "Choose a time slot"),
  callerName: z.string().trim().min(1, "Caller name is required").max(200),
  callerPhone: z.string().trim().min(4, "Caller phone is required").max(30),
  leadId: z.string().trim().max(64).or(z.literal("")),
  notes: z.string().trim().max(2000).or(z.literal("")),
});

export interface BookingState extends ActionState {
  appointmentId?: string;
}

export async function bookAppointment(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  const ctx = await requireOrgContext();
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }
  const d = parsed.data;
  const start = new Date(d.slotStart);
  if (Number.isNaN(start.getTime())) return { error: "Invalid slot" };
  const db = await getDb();
  const orgId = ctx.organization.id;

  const types = await db
    .select()
    .from(schema.appointmentTypes)
    .where(
      and(
        eq(schema.appointmentTypes.id, d.appointmentTypeId),
        eq(schema.appointmentTypes.organizationId, orgId),
      ),
    )
    .limit(1);
  const type = types[0];
  if (!type) return { error: "Appointment type not found" };
  const end = new Date(start.getTime() + type.durationMinutes * 60 * 1000);

  if (d.leadId) {
    const leads = await db
      .select({ id: schema.leads.id })
      .from(schema.leads)
      .where(and(eq(schema.leads.id, d.leadId), eq(schema.leads.organizationId, orgId)))
      .limit(1);
    if (!leads[0]) return { error: "Lead not found" };
  }

  // Conflict check immediately before insert — the slot may have been taken
  // since the picker rendered. Buffer applies on both sides.
  const bufferMs = type.bufferMinutes * 60 * 1000;
  const conflicts = await db
    .select({ id: schema.appointments.id })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.organizationId, orgId),
        inArray(schema.appointments.status, ["scheduled", "confirmed", "rescheduled"]),
        lte(schema.appointments.startsAt, new Date(end.getTime() + bufferMs)),
        gte(schema.appointments.endsAt, new Date(start.getTime() - bufferMs)),
      ),
    )
    .limit(1);
  if (conflicts[0]) {
    return { error: "That slot was just taken — please pick another time." };
  }

  const appointmentId = newId("appt");
  await db.insert(schema.appointments).values({
    id: appointmentId,
    organizationId: orgId,
    appointmentTypeId: type.id,
    leadId: d.leadId || null,
    callerName: d.callerName,
    callerPhone: d.callerPhone,
    service: type.name,
    startsAt: start,
    endsAt: end,
    location: type.location,
    status: "scheduled",
    notes: d.notes || null,
    calendarSyncStatus: "pending",
    crmSyncStatus: "pending",
  });

  // External calendar event (best-effort; failure is recorded, not fatal)
  try {
    const { primary } = await getCalendarProviders(orgId);
    const ref = await primary.createEvent({
      title: `${type.name} — ${d.callerName}`,
      description: `Booked by FlowNet AI Receptionist. Phone: ${d.callerPhone}`,
      start,
      end,
      attendeeName: d.callerName,
      attendeePhone: d.callerPhone,
      location: type.location ?? undefined,
    });
    await db
      .update(schema.appointments)
      .set({ calendarEventId: ref.eventId, calendarSyncStatus: "synced" })
      .where(eq(schema.appointments.id, appointmentId));
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId: orgId,
      providerType: "calendar",
      provider: ref.provider,
      operation: "create_event",
      success: true,
    });
  } catch (err) {
    await db
      .update(schema.appointments)
      .set({ calendarSyncStatus: "failed" })
      .where(eq(schema.appointments.id, appointmentId));
    await db.insert(schema.integrationLogs).values({
      id: newId("il"),
      organizationId: orgId,
      providerType: "calendar",
      provider: "unknown",
      operation: "create_event",
      success: false,
      detail: { message: err instanceof Error ? err.message : "unknown" },
    });
  }

  // Queue the confirmation — delivery goes live with SMS/email providers
  // (Phases 6-7); until then the queue is visible in SMS Activity.
  const profiles = await db
    .select({ businessName: schema.businessProfiles.businessName, mainPhone: schema.businessProfiles.mainPhone })
    .from(schema.businessProfiles)
    .where(eq(schema.businessProfiles.organizationId, orgId))
    .limit(1);
  const businessName = profiles[0]?.businessName ?? ctx.organization.name;
  const confirmation = renderTemplate(
    type.confirmationMessage ??
      "Hi {{caller_name}}! Your {{appointment_type}} with {{business_name}} is confirmed for {{time}}. Reply C to cancel.",
    {
      caller_name: d.callerName,
      appointment_type: type.name,
      business_name: businessName,
      time: start.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    },
  );
  await db.insert(schema.smsMessages).values({
    id: newId("sms"),
    organizationId: orgId,
    leadId: d.leadId || null,
    direction: "outbound",
    fromNumber: profiles[0]?.mainPhone ?? "pending",
    toNumber: d.callerPhone,
    body: confirmation,
    status: "queued",
  });

  if (d.leadId) {
    await db
      .update(schema.leads)
      .set({ status: "appointment_booked", updatedAt: new Date() })
      .where(eq(schema.leads.id, d.leadId));
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: ctx.user.id,
    action: "appointment.book",
    entityType: "appointment",
    entityId: appointmentId,
  });
  revalidatePath("/app/appointments");
  revalidatePath("/app/leads");
  return { success: "Appointment booked and confirmation queued", appointmentId };
}

const statusSchema = z.object({
  appointmentId: z.string().min(1),
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
});

export async function updateAppointmentStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgContext();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request" };
  const db = await getDb();

  const rows = await db
    .select()
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.id, parsed.data.appointmentId),
        eq(schema.appointments.organizationId, ctx.organization.id),
      ),
    )
    .limit(1);
  const appointment = rows[0];
  if (!appointment) return { error: "Appointment not found" };

  await db
    .update(schema.appointments)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(schema.appointments.id, appointment.id));

  // Cancelling removes the external calendar event when one exists.
  if (parsed.data.status === "cancelled" && appointment.calendarEventId) {
    try {
      const { primary } = await getCalendarProviders(ctx.organization.id);
      await primary.deleteEvent(appointment.calendarEventId);
    } catch {
      // Deletion failure is non-fatal; the event is orphaned, not the booking.
    }
  }

  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: `appointment.${parsed.data.status}`,
    entityId: appointment.id,
  });
  revalidatePath("/app/appointments");
  return { success: `Appointment ${parsed.data.status.replaceAll("_", " ")}` };
}

/* ── Calendar connections ───────────────────────────────────────────── */

export async function disconnectCalendar(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireOrgRole("manager");
  const id = String(formData.get("connectionId") ?? "");
  if (!id) return { error: "Missing connection" };
  const db = await getDb();
  const result = await db
    .update(schema.calendarConnections)
    .set({ status: "disconnected", encryptedCredentials: null })
    .where(
      and(
        eq(schema.calendarConnections.id, id),
        eq(schema.calendarConnections.organizationId, ctx.organization.id),
      ),
    )
    .returning();
  if (result.length === 0) return { error: "Connection not found" };
  await writeAuditLog({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    action: "calendar.disconnect",
    entityId: id,
  });
  revalidatePath("/app/calendars");
  return { success: "Calendar disconnected" };
}
