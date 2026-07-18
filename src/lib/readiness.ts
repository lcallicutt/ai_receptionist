/**
 * Activation readiness — pure logic, computed server-side before a
 * receptionist can go live. Blockers prevent activation; warnings don't.
 */

export interface ReadinessInput {
  hasActivePhoneNumber: boolean;
  hasVoiceProviderConnection: boolean;
  hasGreeting: boolean;
  hasBusinessHours: boolean;
  callGoalCount: number;
  notificationRecipientCount: number;
  bookingEnabled: boolean;
  hasCalendarConnection: boolean;
  crmLoggingEnabled: boolean;
  hasCrmConnection: boolean;
  consentSettingsReviewed: boolean;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  severity: "blocker" | "warning";
  note?: string;
}

export interface ReadinessResult {
  checks: ReadinessCheck[];
  score: number; // 0–100
  canActivate: boolean;
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const checks: ReadinessCheck[] = [
    {
      key: "phone_number",
      label: "Active phone number",
      passed: input.hasActivePhoneNumber,
      severity: "blocker",
    },
    {
      key: "voice_provider",
      label: "Voice provider connection",
      passed: input.hasVoiceProviderConnection,
      severity: "warning",
      note: "Live voice integration arrives in Phase 5 — configuration can proceed without it.",
    },
    {
      key: "greeting",
      label: "Greeting configured",
      passed: input.hasGreeting,
      severity: "blocker",
    },
    {
      key: "business_hours",
      label: "Business hours configured",
      passed: input.hasBusinessHours,
      severity: "blocker",
    },
    {
      key: "call_goals",
      label: "At least one call goal selected",
      passed: input.callGoalCount > 0,
      severity: "blocker",
    },
    {
      key: "notification_recipient",
      label: "Notification recipient configured",
      passed: input.notificationRecipientCount > 0,
      severity: "blocker",
    },
    {
      key: "consent_reviewed",
      label: "Consent and recording settings reviewed",
      passed: input.consentSettingsReviewed,
      severity: "blocker",
    },
  ];

  if (input.bookingEnabled) {
    checks.push({
      key: "calendar",
      label: "Calendar connected (booking enabled)",
      passed: input.hasCalendarConnection,
      severity: "warning",
      note: "Calendar integration arrives in Phase 4.",
    });
  }
  if (input.crmLoggingEnabled) {
    checks.push({
      key: "crm",
      label: "CRM connected (CRM logging enabled)",
      passed: input.hasCrmConnection,
      severity: "warning",
      note: "CRM integration arrives in Phase 6.",
    });
  }

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const canActivate = checks.every((c) => c.severity !== "blocker" || c.passed);
  return { checks, score, canActivate };
}
