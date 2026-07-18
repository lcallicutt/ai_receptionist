import { describe, it, expect } from "vitest";
import { computeAvailableSlots, type BusinessHoursRow } from "@/lib/availability";

// Monday 2026-07-20 09:00–17:00 UTC business hours, all week
const HOURS: BusinessHoursRow[] = Array.from({ length: 7 }, (_, day) => ({
  dayOfWeek: day,
  opensAt: "09:00",
  closesAt: "17:00",
  isClosed: day === 0, // closed Sundays
}));

const MONDAY_8AM = new Date("2026-07-20T08:00:00Z"); // Monday

const BASE_OPTS = {
  durationMinutes: 60,
  bufferMinutes: 0,
  minNoticeHours: 0,
  timeZone: "UTC",
  days: 1,
  now: MONDAY_8AM,
};

describe("availability engine", () => {
  it("produces slots only inside business hours", () => {
    const slots = computeAvailableSlots(HOURS, [], BASE_OPTS);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.start.toISOString()).toBe("2026-07-20T09:00:00.000Z");
    const last = slots.at(-1)!;
    expect(last.end.getTime()).toBeLessThanOrEqual(new Date("2026-07-20T17:00:00Z").getTime());
  });

  it("skips closed days entirely", () => {
    const sunday = new Date("2026-07-19T08:00:00Z");
    const slots = computeAvailableSlots(HOURS, [], { ...BASE_OPTS, now: sunday, days: 1 });
    expect(slots).toHaveLength(0);
  });

  it("respects minimum booking notice", () => {
    const slots = computeAvailableSlots(HOURS, [], { ...BASE_OPTS, minNoticeHours: 4 });
    // now = 08:00, so nothing before 12:00
    expect(slots[0]?.start.toISOString()).toBe("2026-07-20T12:00:00.000Z");
  });

  it("excludes slots that conflict with busy intervals", () => {
    const busy = [
      { start: new Date("2026-07-20T10:00:00Z"), end: new Date("2026-07-20T11:00:00Z") },
    ];
    const slots = computeAvailableSlots(HOURS, busy, BASE_OPTS);
    const starts = slots.map((s) => s.start.toISOString());
    expect(starts).not.toContain("2026-07-20T10:00:00.000Z");
    expect(starts).not.toContain("2026-07-20T10:30:00.000Z"); // overlaps busy hour
    expect(starts).toContain("2026-07-20T09:00:00.000Z");
    expect(starts).toContain("2026-07-20T11:00:00.000Z");
  });

  it("expands conflicts by the buffer on both sides", () => {
    const busy = [
      { start: new Date("2026-07-20T12:00:00Z"), end: new Date("2026-07-20T13:00:00Z") },
    ];
    const slots = computeAvailableSlots(HOURS, busy, { ...BASE_OPTS, bufferMinutes: 30 });
    const starts = slots.map((s) => s.start.toISOString());
    // 11:00-12:00 slot would end inside the 30-min pre-buffer (11:30-12:00)
    expect(starts).not.toContain("2026-07-20T11:00:00.000Z");
    expect(starts).not.toContain("2026-07-20T13:00:00.000Z"); // starts inside post-buffer
    expect(starts).toContain("2026-07-20T13:30:00.000Z");
  });

  it("never returns a slot that would run past closing", () => {
    const slots = computeAvailableSlots(HOURS, [], { ...BASE_OPTS, durationMinutes: 120 });
    const last = slots.at(-1)!;
    expect(last.start.toISOString()).toBe("2026-07-20T15:00:00.000Z");
  });

  it("handles timezone-local business hours", () => {
    // now = Sunday 20:00 in New York (closed) — search must roll to Monday
    const slots = computeAvailableSlots(HOURS, [], {
      ...BASE_OPTS,
      timeZone: "America/New_York",
      now: new Date("2026-07-20T00:00:00Z"),
      days: 2,
    });
    // 09:00 America/New_York in July (EDT, UTC-4) = 13:00 UTC
    expect(slots[0]?.start.toISOString()).toBe("2026-07-20T13:00:00.000Z");
  });
});
