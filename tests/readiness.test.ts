import { describe, it, expect } from "vitest";
import { computeReadiness, type ReadinessInput } from "@/lib/readiness";

const READY: ReadinessInput = {
  hasActivePhoneNumber: true,
  hasVoiceProviderConnection: false, // warning only (Phase 5)
  hasGreeting: true,
  hasBusinessHours: true,
  callGoalCount: 2,
  notificationRecipientCount: 1,
  bookingEnabled: false,
  hasCalendarConnection: false,
  crmLoggingEnabled: false,
  hasCrmConnection: false,
  consentSettingsReviewed: true,
};

describe("activation readiness", () => {
  it("allows activation when all blockers pass, even with warnings pending", () => {
    const result = computeReadiness(READY);
    expect(result.canActivate).toBe(true);
    expect(result.score).toBeLessThan(100); // voice provider warning unfulfilled
    expect(result.score).toBeGreaterThan(0);
  });

  it("blocks activation without a greeting", () => {
    const result = computeReadiness({ ...READY, hasGreeting: false });
    expect(result.canActivate).toBe(false);
    expect(result.checks.find((c) => c.key === "greeting")?.passed).toBe(false);
  });

  it("blocks activation without a phone number, hours, goals, recipient, or consent", () => {
    for (const override of [
      { hasActivePhoneNumber: false },
      { hasBusinessHours: false },
      { callGoalCount: 0 },
      { notificationRecipientCount: 0 },
      { consentSettingsReviewed: false },
    ] satisfies Array<Partial<ReadinessInput>>) {
      expect(computeReadiness({ ...READY, ...override }).canActivate).toBe(false);
    }
  });

  it("adds a calendar warning only when booking is enabled", () => {
    const withoutBooking = computeReadiness(READY);
    expect(withoutBooking.checks.some((c) => c.key === "calendar")).toBe(false);

    const withBooking = computeReadiness({ ...READY, bookingEnabled: true });
    const calendarCheck = withBooking.checks.find((c) => c.key === "calendar");
    expect(calendarCheck?.severity).toBe("warning");
    // warning does not block activation
    expect(withBooking.canActivate).toBe(true);
  });

  it("scores 100 when every check passes", () => {
    const result = computeReadiness({
      ...READY,
      hasVoiceProviderConnection: true,
      bookingEnabled: true,
      hasCalendarConnection: true,
      crmLoggingEnabled: true,
      hasCrmConnection: true,
    });
    expect(result.score).toBe(100);
    expect(result.canActivate).toBe(true);
  });
});
