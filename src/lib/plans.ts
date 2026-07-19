/**
 * Plan definitions and server-side plan enforcement.
 *
 * These constants seed the `plans` and `plan_features` tables and are the
 * single source of truth for plan limits. Enforcement always happens
 * server-side via `planAllows` / `planLimit` against the org's subscription —
 * frontend restrictions are cosmetic only.
 */

export type PlanTier = "basic" | "growth" | "premium";

export type FeatureKey =
  | "call_answering"
  | "faq_responses"
  | "caller_info_capture"
  | "lead_qualification"
  | "missed_call_text_back"
  | "call_summaries"
  | "crm_webhook_logging"
  | "appointment_booking"
  | "calendar_integration"
  | "crm_integration"
  | "custom_qualification_workflow"
  | "call_transfer_rules"
  | "advanced_call_summaries"
  | "follow_up_sms"
  | "lead_dashboard"
  | "multiple_call_flows"
  | "advanced_routing"
  | "multiple_locations"
  | "custom_integrations"
  | "priority_support"
  | "detailed_analytics"
  | "custom_scripting"
  | "custom_crm_workflows"
  | "advanced_escalation_rules"
  | "team_permissions"
  | "usage_based_billing";

export type LimitKey =
  | "receptionists"
  | "phone_numbers"
  | "notification_recipients"
  | "appointment_types"
  | "calendars"
  | "included_voice_minutes"
  | "included_sms_messages";

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  monthlyPriceCents: number;
  usageBased: boolean;
  tagline: string;
  features: FeatureKey[];
  limits: Record<LimitKey, number | null>; // null = unlimited
  highlights: string[];
}

const BASIC_FEATURES: FeatureKey[] = [
  "call_answering",
  "faq_responses",
  "caller_info_capture",
  "lead_qualification",
  "missed_call_text_back",
  "call_summaries",
  "crm_webhook_logging",
];

const GROWTH_FEATURES: FeatureKey[] = [
  ...BASIC_FEATURES,
  "appointment_booking",
  "calendar_integration",
  "crm_integration",
  "custom_qualification_workflow",
  "call_transfer_rules",
  "advanced_call_summaries",
  "follow_up_sms",
  "lead_dashboard",
];

const PREMIUM_FEATURES: FeatureKey[] = [
  ...GROWTH_FEATURES,
  "multiple_call_flows",
  "advanced_routing",
  "multiple_locations",
  "custom_integrations",
  "priority_support",
  "detailed_analytics",
  "custom_scripting",
  "custom_crm_workflows",
  "advanced_escalation_rules",
  "team_permissions",
  "usage_based_billing",
];

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  basic: {
    tier: "basic",
    name: "Basic",
    monthlyPriceCents: 14900,
    usageBased: false,
    tagline: "24/7 answering and lead capture for one line.",
    features: BASIC_FEATURES,
    limits: {
      receptionists: 1,
      phone_numbers: 1,
      notification_recipients: 1,
      appointment_types: 0,
      calendars: 0,
      included_voice_minutes: 300,
      included_sms_messages: 250,
    },
    highlights: [
      "One AI receptionist",
      "One phone number",
      "24/7 call answering",
      "Basic FAQ responses",
      "Caller information capture",
      "Lead qualification",
      "Missed-call text-back",
      "Call summaries",
      "One notification recipient",
      "Basic CRM logging via webhook",
      "Monthly usage allowance",
    ],
  },
  growth: {
    tier: "growth",
    name: "Growth",
    monthlyPriceCents: 29900,
    usageBased: false,
    tagline: "Booking, calendar sync, and CRM integration.",
    features: GROWTH_FEATURES,
    limits: {
      receptionists: 1,
      phone_numbers: 2,
      notification_recipients: 3,
      appointment_types: 5,
      calendars: 1,
      included_voice_minutes: 750,
      included_sms_messages: 750,
    },
    highlights: [
      "Everything in Basic",
      "Appointment booking",
      "Calendar integration",
      "Multiple appointment types",
      "Up to three notification recipients",
      "CRM integration",
      "Custom lead qualification workflow",
      "Call transfer rules",
      "Advanced call summaries",
      "Follow-up SMS",
      "Lead dashboard",
      "Higher monthly usage allowance",
    ],
  },
  premium: {
    tier: "premium",
    name: "Premium",
    monthlyPriceCents: 49900,
    usageBased: true,
    tagline: "Multi-location routing, analytics, and white-glove setup.",
    features: PREMIUM_FEATURES,
    limits: {
      receptionists: null,
      phone_numbers: null,
      notification_recipients: null,
      appointment_types: null,
      calendars: null,
      included_voice_minutes: 2000,
      included_sms_messages: 2000,
    },
    highlights: [
      "Everything in Growth",
      "Multiple departments or call flows",
      "Advanced routing",
      "Multiple calendars and locations",
      "Custom integrations",
      "Priority support",
      "Detailed analytics",
      "Custom AI receptionist scripting",
      "Custom CRM workflows",
      "Advanced escalation rules",
      "Team permissions",
      "White-glove implementation",
      "Usage-based billing",
    ],
  },
};

/** Does this plan tier include the feature? Server-side enforcement helper. */
export function planAllows(tier: PlanTier, feature: FeatureKey): boolean {
  return PLAN_DEFINITIONS[tier].features.includes(feature);
}

/** Numeric limit for a plan (null = unlimited). */
export function planLimit(tier: PlanTier, limit: LimitKey): number | null {
  return PLAN_DEFINITIONS[tier].limits[limit];
}

/** True when `currentCount` has reached the plan's cap for `limit`. */
export function planLimitReached(
  tier: PlanTier,
  limit: LimitKey,
  currentCount: number,
): boolean {
  const cap = planLimit(tier, limit);
  if (cap === null) return false;
  return currentCount >= cap;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/* ── Usage & overage configuration ──────────────────────────────────── */

export type UsageType =
  | "voice_minutes"
  | "phone_numbers"
  | "sms_messages"
  | "ai_processing"
  | "call_recordings"
  | "transcription_minutes"
  | "calendar_bookings"
  | "crm_sync_operations"
  | "premium_workflow_executions";

/** Per-unit overage rates in cents — configuration, not hard-coded UI. */
export const OVERAGE_RATES_CENTS: Partial<Record<UsageType, number>> = {
  voice_minutes: 15,
  sms_messages: 2,
  transcription_minutes: 5,
};

/** Which plan limit backs each metered usage type (null = no allowance). */
export const USAGE_ALLOWANCE_KEYS: Partial<Record<UsageType, LimitKey>> = {
  voice_minutes: "included_voice_minutes",
  sms_messages: "included_sms_messages",
};

export const USAGE_LABELS: Record<UsageType, { label: string; unit: string }> = {
  voice_minutes: { label: "Voice minutes", unit: "min" },
  phone_numbers: { label: "Phone numbers", unit: "numbers" },
  sms_messages: { label: "SMS messages", unit: "messages" },
  ai_processing: { label: "AI processing", unit: "ops" },
  call_recordings: { label: "Call recordings", unit: "recordings" },
  transcription_minutes: { label: "Transcription", unit: "min" },
  calendar_bookings: { label: "Calendar bookings", unit: "bookings" },
  crm_sync_operations: { label: "CRM syncs", unit: "ops" },
  premium_workflow_executions: { label: "Premium workflows", unit: "runs" },
};

/** Overage estimate in cents for one usage type. */
export function estimateOverageCents(
  tier: PlanTier,
  usageType: UsageType,
  used: number,
): number {
  const allowanceKey = USAGE_ALLOWANCE_KEYS[usageType];
  const rate = OVERAGE_RATES_CENTS[usageType];
  if (!allowanceKey || !rate) return 0;
  const allowance = planLimit(tier, allowanceKey);
  if (allowance === null) return 0;
  return Math.max(0, used - allowance) * rate;
}
