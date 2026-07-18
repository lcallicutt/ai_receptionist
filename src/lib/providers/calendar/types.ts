import type { BusyInterval } from "@/lib/availability";

/**
 * CalendarProvider — the provider-neutral contract for availability lookup
 * and event management. Implementations: internal (built-in scheduling),
 * Google Calendar; Outlook follows the same contract in a later phase.
 */
export interface CalendarEventInput {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeName?: string;
  attendeePhone?: string;
  location?: string;
}

export interface CalendarEventRef {
  provider: string;
  eventId: string;
}

export interface CalendarProvider {
  readonly name: string;
  /** Busy intervals between from/to (inclusive of tentative bookings). */
  getBusyIntervals(from: Date, to: Date): Promise<BusyInterval[]>;
  /** Creates an event; returns a stable provider reference. */
  createEvent(input: CalendarEventInput): Promise<CalendarEventRef>;
  /** Deletes an event; must be idempotent (missing event is not an error). */
  deleteEvent(eventId: string): Promise<void>;
}
