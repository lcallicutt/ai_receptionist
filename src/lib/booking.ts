import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { computeAvailableSlots, type AvailableSlot } from "@/lib/availability";
import { getMergedBusyIntervals } from "@/lib/providers/calendar";

/**
 * Booking read-model: open slots for one of a tenant's appointment types,
 * derived from business hours + merged provider busy time.
 */
export async function getAvailableSlotsForType(
  organizationId: string,
  appointmentTypeId: string,
  opts: { days?: number; now?: Date; limit?: number } = {},
): Promise<{ type: typeof schema.appointmentTypes.$inferSelect; slots: AvailableSlot[] } | null> {
  const db = await getDb();
  const types = await db
    .select()
    .from(schema.appointmentTypes)
    .where(
      and(
        eq(schema.appointmentTypes.id, appointmentTypeId),
        eq(schema.appointmentTypes.organizationId, organizationId),
        eq(schema.appointmentTypes.isActive, true),
      ),
    )
    .limit(1);
  const type = types[0];
  if (!type) return null;

  const [hours, profiles] = await Promise.all([
    db
      .select()
      .from(schema.businessHours)
      .where(eq(schema.businessHours.organizationId, organizationId))
      .orderBy(asc(schema.businessHours.dayOfWeek)),
    db
      .select({ timeZone: schema.businessProfiles.timeZone })
      .from(schema.businessProfiles)
      .where(eq(schema.businessProfiles.organizationId, organizationId))
      .limit(1),
  ]);

  const now = opts.now ?? new Date();
  const days = opts.days ?? 7;
  const to = new Date(now.getTime() + (days + 1) * 24 * 60 * 60 * 1000);
  const busy = await getMergedBusyIntervals(organizationId, now, to);

  const slots = computeAvailableSlots(hours, busy, {
    durationMinutes: type.durationMinutes,
    bufferMinutes: type.bufferMinutes,
    minNoticeHours: type.minNoticeHours,
    timeZone: profiles[0]?.timeZone ?? "America/New_York",
    days,
    now,
    limit: opts.limit ?? 48,
  });
  return { type, slots };
}

/** Fills {{placeholders}} in confirmation/reminder templates. */
export function renderTemplate(
  template: string,
  vars: Record<string, string | undefined>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? "");
}
