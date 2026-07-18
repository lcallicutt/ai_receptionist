import "server-only";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { BusyInterval } from "@/lib/availability";
import type { CalendarProvider, CalendarEventInput, CalendarEventRef } from "./types";

/**
 * Built-in scheduling: busy time comes from the tenant's own appointments
 * table. Always available — used until an external calendar is connected,
 * and always merged in so double-booking is impossible even when an
 * external provider is the source of truth for other events.
 */
export class InternalCalendarProvider implements CalendarProvider {
  readonly name = "internal";

  constructor(private organizationId: string) {}

  async getBusyIntervals(from: Date, to: Date): Promise<BusyInterval[]> {
    const db = await getDb();
    const rows = await db
      .select({ startsAt: schema.appointments.startsAt, endsAt: schema.appointments.endsAt })
      .from(schema.appointments)
      .where(
        and(
          eq(schema.appointments.organizationId, this.organizationId),
          inArray(schema.appointments.status, ["scheduled", "confirmed", "rescheduled"]),
          gte(schema.appointments.endsAt, from),
          lte(schema.appointments.startsAt, to),
        ),
      );
    return rows.map((r) => ({ start: r.startsAt, end: r.endsAt }));
  }

  async createEvent(_input: CalendarEventInput): Promise<CalendarEventRef> {
    // The appointment row itself is the event; a synthetic ref keeps the
    // contract uniform across providers.
    return { provider: this.name, eventId: newId("ical") };
  }

  async deleteEvent(_eventId: string): Promise<void> {
    // Appointment rows are cancelled by the booking service, not here.
  }
}
