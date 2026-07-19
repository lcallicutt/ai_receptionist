/**
 * Availability engine — pure logic, timezone-aware, provider-agnostic.
 * Busy intervals come from a CalendarProvider (internal appointments,
 * Google, Outlook); this module only does the math.
 */

export interface BusinessHoursRow {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  opensAt: string | null; // "09:00" business-local
  closesAt: string | null;
  isClosed: boolean;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface SlotOptions {
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  /** IANA timezone of the business, e.g. "America/New_York". */
  timeZone: string;
  /** Slot grid step; defaults to 30 minutes. */
  stepMinutes?: number;
  /** How many days ahead to search. */
  days?: number;
  /** "Now" — injectable for tests. */
  now?: Date;
  /** Max slots to return. */
  limit?: number;
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds. */
function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "00" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** UTC instant for a business-local wall-clock time on a given local date. */
function zonedInstant(
  timeZone: string,
  year: number,
  month: number, // 1-12
  day: number,
  hhmm: string,
): Date {
  const [hh = 0, mm = 0] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hh, mm));
  // Two-pass adjustment handles DST edges well enough for scheduling.
  const offset1 = tzOffsetMs(timeZone, guess);
  const adjusted = new Date(guess.getTime() - offset1);
  const offset2 = tzOffsetMs(timeZone, adjusted);
  return new Date(guess.getTime() - offset2);
}

/** Local calendar date + weekday of an instant in a timezone. */
function localDateParts(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dayOfWeek: weekdayMap[parts.weekday ?? "Sun"] ?? 0,
  };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
}

/**
 * Computes open appointment slots: inside business hours, at least
 * minNoticeHours in the future, and clear of every busy interval expanded by
 * the buffer on both sides.
 */
export function computeAvailableSlots(
  hours: BusinessHoursRow[],
  busy: BusyInterval[],
  opts: SlotOptions,
): AvailableSlot[] {
  const {
    durationMinutes,
    bufferMinutes,
    minNoticeHours,
    timeZone,
    stepMinutes = 30,
    days = 7,
    now = new Date(),
    limit = 60,
  } = opts;

  const hoursByDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const earliest = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
  const durationMs = durationMinutes * 60 * 1000;
  const bufferMs = bufferMinutes * 60 * 1000;
  const stepMs = stepMinutes * 60 * 1000;

  const slots: AvailableSlot[] = [];
  for (let d = 0; d < days && slots.length < limit; d++) {
    const dayAnchor = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const { year, month, day, dayOfWeek } = localDateParts(timeZone, dayAnchor);
    const dayHours = hoursByDay.get(dayOfWeek);
    if (!dayHours || dayHours.isClosed || !dayHours.opensAt || !dayHours.closesAt) continue;

    const open = zonedInstant(timeZone, year, month, day, dayHours.opensAt);
    const close = zonedInstant(timeZone, year, month, day, dayHours.closesAt);

    for (
      let start = open.getTime();
      start + durationMs <= close.getTime() && slots.length < limit;
      start += stepMs
    ) {
      const slotStart = new Date(start);
      const slotEnd = new Date(start + durationMs);
      if (slotStart < earliest) continue;
      const blocked = busy.some((b) =>
        overlaps(
          slotStart,
          slotEnd,
          new Date(b.start.getTime() - bufferMs),
          new Date(b.end.getTime() + bufferMs),
        ),
      );
      if (!blocked) slots.push({ start: slotStart, end: slotEnd });
    }
  }
  return slots;
}
