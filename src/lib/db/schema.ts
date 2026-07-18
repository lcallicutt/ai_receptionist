/**
 * FlowNet AI Receptionist — multi-tenant database schema.
 *
 * Every tenant-owned table carries an `organizationId` foreign key.
 * Cross-tenant access is prevented at the query layer (see src/lib/auth) —
 * queries must always be scoped through the authenticated member's org.
 */
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
  index,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";

/* ────────────────────────────── Enums ────────────────────────────── */

export const userRoleEnum = pgEnum("user_role", [
  "super_admin", // FlowNet Super Admin
  "agency_admin", // Agency Admin
  "owner", // Business Owner
  "manager", // Business Manager
  "member", // Team Member
  "read_only", // Read-Only User
]);

export const planTierEnum = pgEnum("plan_tier", ["basic", "growth", "premium"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "canceled",
  "complimentary",
]);

export const industryEnum = pgEnum("industry", [
  "realtor",
  "home_services",
  "med_spa",
  "salon",
  "law_office",
  "church",
  "other",
]);

export const callOutcomeEnum = pgEnum("call_outcome", [
  "appointment_booked",
  "lead_captured",
  "message_taken",
  "call_transferred",
  "faq_resolved",
  "caller_disconnected",
  "spam",
  "disqualified",
  "emergency_escalation",
  "booking_failed",
  "transfer_failed",
  "follow_up_required",
]);

export const callDirectionEnum = pgEnum("call_direction", ["inbound", "outbound"]);

export const callStatusEnum = pgEnum("call_status", [
  "ringing",
  "in_progress",
  "completed",
  "missed",
  "abandoned",
  "failed",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "follow_up_required",
  "won",
  "lost",
  "disqualified",
]);

export const leadClassificationEnum = pgEnum("lead_classification", [
  "hot",
  "warm",
  "cold",
  "disqualified",
  "existing_customer",
  "vendor",
  "spam",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
  "failed",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "synced",
  "failed",
  "retrying",
  "skipped",
]);

export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);

export const messageStatusEnum = pgEnum("message_status", [
  "queued",
  "sent",
  "delivered",
  "failed",
  "received",
]);

export const receptionistStatusEnum = pgEnum("receptionist_status", [
  "draft",
  "active",
  "paused",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "short_text",
  "long_text",
  "yes_no",
  "number",
  "date",
  "time",
  "multiple_choice",
  "address",
  "email",
  "phone",
  "service_type",
  "budget_range",
  "urgency_level",
]);

export const providerTypeEnum = pgEnum("provider_type", [
  "voice",
  "telephony",
  "sms",
  "calendar",
  "crm",
  "email",
  "automation_webhook",
]);

export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "received",
  "processing",
  "processed",
  "failed",
  "duplicate",
  "invalid_signature",
]);

export const usageTypeEnum = pgEnum("usage_type", [
  "voice_minutes",
  "phone_numbers",
  "sms_messages",
  "ai_processing",
  "call_recordings",
  "transcription_minutes",
  "calendar_bookings",
  "crm_sync_operations",
  "premium_workflow_executions",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "crm",
  "webhook",
]);

export const consentTypeEnum = pgEnum("consent_type", [
  "call_recording",
  "sms_marketing",
  "sms_transactional",
  "data_processing",
  "terms_of_service",
]);

/* ─────────────────────── Identity & tenancy ──────────────────────── */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    industry: industryEnum("industry").notNull().default("other"),
    isDemo: boolean("is_demo").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organizations_slug_idx").on(t.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("org_members_org_user_idx").on(t.organizationId, t.userId),
    index("org_members_user_idx").on(t.userId),
  ],
);

/* ───────────────────────── Plans & billing ───────────────────────── */

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  tier: planTierEnum("tier").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  setupFeeCents: integer("setup_fee_cents").notNull().default(0),
  usageBased: boolean("usage_based").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planFeatures = pgTable(
  "plan_features",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // numeric limit for countable features (null = unlimited)
    limitValue: integer("limit_value"),
  },
  (t) => [uniqueIndex("plan_features_plan_key_idx").on(t.planId, t.featureKey)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    couponCode: text("coupon_code"),
    manualBilling: boolean("manual_billing").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_org_idx").on(t.organizationId)],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    usageType: usageTypeEnum("usage_type").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    receptionistId: text("receptionist_id"),
    phoneNumberId: text("phone_number_id"),
    callRecordId: text("call_record_id"),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usage_records_org_idx").on(t.organizationId),
    index("usage_records_org_type_period_idx").on(t.organizationId, t.usageType, t.periodStart),
  ],
);

/* ─────────────────────── Business configuration ──────────────────── */

export const businessProfiles = pgTable(
  "business_profiles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    website: text("website"),
    mainPhone: text("main_phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").default("US"),
    timeZone: text("time_zone").notNull().default("America/New_York"),
    serviceAreas: jsonb("service_areas").$type<string[]>().default([]),
    primaryContactName: text("primary_contact_name"),
    primaryContactEmail: text("primary_contact_email"),
    notificationPhone: text("notification_phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("business_profiles_org_idx").on(t.organizationId)],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // 0 = Sunday … 6 = Saturday
    dayOfWeek: integer("day_of_week").notNull(),
    opensAt: text("opens_at"), // "09:00" 24h local time; null = closed
    closesAt: text("closes_at"),
    isClosed: boolean("is_closed").notNull().default(false),
  },
  (t) => [uniqueIndex("business_hours_org_day_idx").on(t.organizationId, t.dayOfWeek)],
);

export const holidayHours = pgTable(
  "holiday_hours",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    holidayDate: date("holiday_date").notNull(),
    isClosed: boolean("is_closed").notNull().default(true),
    opensAt: text("opens_at"),
    closesAt: text("closes_at"),
  },
  (t) => [index("holiday_hours_org_idx").on(t.organizationId)],
);

/* ─────────────────────── Receptionist config ─────────────────────── */

export const aiReceptionists = pgTable(
  "ai_receptionists",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: receptionistStatusEnum("status").notNull().default("draft"),
    voiceId: text("voice_id"),
    tone: text("tone").notNull().default("warm_friendly"),
    greeting: text("greeting"),
    speakingSpeed: numeric("speaking_speed", { precision: 3, scale: 2 }).default("1.00"),
    formality: text("formality").default("professional"),
    language: text("language").notNull().default("en-US"),
    pronunciationNotes: text("pronunciation_notes"),
    callGoals: jsonb("call_goals").$type<string[]>().default([]),
    restrictedTopics: jsonb("restricted_topics").$type<string[]>().default([]),
    complianceStatements: jsonb("compliance_statements").$type<string[]>().default([]),
    businessKnowledge: text("business_knowledge"),
    confirmationTemplate: text("confirmation_template"),
    followUpTemplate: text("follow_up_template"),
    summaryFormat: text("summary_format"),
    activeVersionId: text("active_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_receptionists_org_idx").on(t.organizationId)],
);

export const receptionistVersions = pgTable(
  "receptionist_versions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id")
      .notNull()
      .references(() => aiReceptionists.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    label: text("label"),
    // full configuration snapshot for preview / publish / rollback
    configSnapshot: jsonb("config_snapshot").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("receptionist_versions_unique_idx").on(t.receptionistId, t.versionNumber),
    index("receptionist_versions_org_idx").on(t.organizationId),
  ],
);

export const phoneNumbers = pgTable(
  "phone_numbers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id").references(() => aiReceptionists.id, {
      onDelete: "set null",
    }),
    e164: text("e164").notNull(), // +15551234567
    label: text("label"),
    provider: text("provider").notNull().default("twilio"),
    providerNumberId: text("provider_number_id"),
    capabilities: jsonb("capabilities").$type<{ voice: boolean; sms: boolean }>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("phone_numbers_e164_idx").on(t.e164),
    index("phone_numbers_org_idx").on(t.organizationId),
  ],
);

/* ──────────────────────────── FAQs ───────────────────────────────── */

export const faqs = pgTable(
  "faqs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id").references(() => aiReceptionists.id, {
      onDelete: "cascade",
    }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: text("category"),
    keywords: jsonb("keywords").$type<string[]>().default([]),
    escalateIfUnanswered: boolean("escalate_if_unanswered").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("faqs_org_idx").on(t.organizationId)],
);

/* ─────────────────────── Qualification flows ─────────────────────── */

export const qualificationFlows = pgTable(
  "qualification_flows",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id").references(() => aiReceptionists.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("qualification_flows_org_idx").on(t.organizationId)],
);

export const qualificationQuestions = pgTable(
  "qualification_questions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    flowId: text("flow_id")
      .notNull()
      .references(() => qualificationFlows.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    questionType: questionTypeEnum("question_type").notNull().default("short_text"),
    required: boolean("required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    // e.g. { questionId, equals: "yes" } — show only when condition matches
    condition: jsonb("condition").$type<{ questionId: string; equals: string } | null>(),
    disqualifyingAnswer: text("disqualifying_answer"),
    leadScoreImpact: integer("lead_score_impact").notNull().default(0),
    internalNotes: text("internal_notes"),
    saveToCrm: boolean("save_to_crm").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    index("qualification_questions_org_idx").on(t.organizationId),
    index("qualification_questions_flow_idx").on(t.flowId),
  ],
);

export const qualificationOptions = pgTable(
  "qualification_options",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => qualificationQuestions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isDisqualifying: boolean("is_disqualifying").notNull().default(false),
    scoreImpact: integer("score_impact").notNull().default(0),
  },
  (t) => [index("qualification_options_question_idx").on(t.questionId)],
);

export const leadScoringRules = pgTable(
  "lead_scoring_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    signal: text("signal").notNull(), // e.g. "urgent_need", "in_service_area"
    points: integer("points").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("lead_scoring_rules_org_idx").on(t.organizationId)],
);

/* ───────────────────────── Calls & callers ───────────────────────── */

export const callers = pgTable(
  "callers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    name: text("name"),
    email: text("email"),
    company: text("company"),
    smsOptedOut: boolean("sms_opted_out").notNull().default(false),
    smsOptedOutAt: timestamp("sms_opted_out_at", { withTimezone: true }),
    lastTextBackAt: timestamp("last_text_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("callers_org_phone_idx").on(t.organizationId, t.phone),
    index("callers_phone_idx").on(t.phone),
  ],
);

export const callRecords = pgTable(
  "call_records",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id").references(() => aiReceptionists.id, {
      onDelete: "set null",
    }),
    phoneNumberId: text("phone_number_id").references(() => phoneNumbers.id, {
      onDelete: "set null",
    }),
    callerId: text("caller_id").references(() => callers.id, { onDelete: "set null" }),
    leadId: text("lead_id"),
    direction: callDirectionEnum("direction").notNull().default("inbound"),
    status: callStatusEnum("status").notNull().default("completed"),
    outcome: callOutcomeEnum("outcome"),
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    sentiment: text("sentiment"), // positive | neutral | negative
    urgency: text("urgency"), // low | medium | high
    isUnread: boolean("is_unread").notNull().default(true),
    assignedUserId: text("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    providerCallId: text("provider_call_id"),
    provider: text("provider"),
    errorDetail: text("error_detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("call_records_org_idx").on(t.organizationId),
    index("call_records_org_started_idx").on(t.organizationId, t.startedAt),
    index("call_records_provider_call_idx").on(t.providerCallId),
    index("call_records_caller_idx").on(t.callerId),
  ],
);

export const callEvents = pgTable(
  "call_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callRecordId: text("call_record_id")
      .notNull()
      .references(() => callRecords.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // greeting_played, faq_answered, transfer_attempted…
    detail: jsonb("detail"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("call_events_call_idx").on(t.callRecordId)],
);

export const callTranscripts = pgTable(
  "call_transcripts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callRecordId: text("call_record_id")
      .notNull()
      .references(() => callRecords.id, { onDelete: "cascade" }),
    // [{ role: "assistant" | "caller", text, ts }]
    segments: jsonb("segments")
      .$type<Array<{ role: string; text: string; ts?: number }>>()
      .notNull(),
    provider: text("provider"),
    providerTranscriptId: text("provider_transcript_id"),
    retainUntil: timestamp("retain_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("call_transcripts_call_idx").on(t.callRecordId)],
);

export const callRecordings = pgTable(
  "call_recordings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callRecordId: text("call_record_id")
      .notNull()
      .references(() => callRecords.id, { onDelete: "cascade" }),
    provider: text("provider"),
    providerRecordingId: text("provider_recording_id"),
    // stored as provider reference; access is brokered server-side w/ time-limited URLs
    storageRef: text("storage_ref"),
    durationSeconds: integer("duration_seconds"),
    consentCaptured: boolean("consent_captured").notNull().default(false),
    retainUntil: timestamp("retain_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("call_recordings_call_idx").on(t.callRecordId)],
);

export const callSummaries = pgTable(
  "call_summaries",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callRecordId: text("call_record_id")
      .notNull()
      .references(() => callRecords.id, { onDelete: "cascade" }),
    smsSummary: text("sms_summary"),
    detailedSummary: text("detailed_summary"),
    reasonForCalling: text("reason_for_calling"),
    servicesRequested: jsonb("services_requested").$type<string[]>().default([]),
    recommendedNextAction: text("recommended_next_action"),
    followUpDeadline: timestamp("follow_up_deadline", { withTimezone: true }),
    sentiment: text("sentiment"),
    complianceConcern: text("compliance_concern"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("call_summaries_call_idx").on(t.callRecordId)],
);

/* ──────────────────────────── Leads ──────────────────────────────── */

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callerId: text("caller_id").references(() => callers.id, { onDelete: "set null" }),
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    company: text("company"),
    address: text("address"),
    callReason: text("call_reason"),
    requestedService: text("requested_service"),
    status: leadStatusEnum("status").notNull().default("new"),
    classification: leadClassificationEnum("classification").notNull().default("warm"),
    score: integer("score").notNull().default(0),
    assignedUserId: text("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    source: text("source").default("ai_receptionist"),
    campaign: text("campaign"),
    crmRecordId: text("crm_record_id"),
    crmSyncStatus: syncStatusEnum("crm_sync_status").notNull().default("pending"),
    crmSyncError: text("crm_sync_error"),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("leads_org_idx").on(t.organizationId),
    index("leads_org_status_idx").on(t.organizationId, t.status),
    index("leads_crm_record_idx").on(t.crmRecordId),
    index("leads_crm_sync_status_idx").on(t.crmSyncStatus),
  ],
);

export const leadAnswers = pgTable(
  "lead_answers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    questionId: text("question_id").references(() => qualificationQuestions.id, {
      onDelete: "set null",
    }),
    questionPrompt: text("question_prompt").notNull(),
    answer: text("answer").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_answers_lead_idx").on(t.leadId)],
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_notes_lead_idx").on(t.leadId)],
);

export const leadTags = pgTable(
  "lead_tags",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => [
    uniqueIndex("lead_tags_lead_tag_idx").on(t.leadId, t.tag),
    index("lead_tags_org_idx").on(t.organizationId),
  ],
);

/* ─────────────────────── Appointments ────────────────────────────── */

export const appointmentTypes = pgTable(
  "appointment_types",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    location: text("location"),
    virtualMeetingLink: text("virtual_meeting_link"),
    minNoticeHours: integer("min_notice_hours").notNull().default(2),
    assignedUserId: text("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmationMessage: text("confirmation_message"),
    reminderMessage: text("reminder_message"),
    reschedulingPolicy: text("rescheduling_policy"),
    cancellationPolicy: text("cancellation_policy"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("appointment_types_org_idx").on(t.organizationId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    appointmentTypeId: text("appointment_type_id").references(() => appointmentTypes.id, {
      onDelete: "set null",
    }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    callRecordId: text("call_record_id").references(() => callRecords.id, {
      onDelete: "set null",
    }),
    callerName: text("caller_name"),
    callerPhone: text("caller_phone"),
    service: text("service"),
    assignedUserId: text("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: text("location"),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    confirmationSent: boolean("confirmation_sent").notNull().default(false),
    reminderSent: boolean("reminder_sent").notNull().default(false),
    calendarSyncStatus: syncStatusEnum("calendar_sync_status").notNull().default("pending"),
    crmSyncStatus: syncStatusEnum("crm_sync_status").notNull().default("pending"),
    calendarEventId: text("calendar_event_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("appointments_org_idx").on(t.organizationId),
    index("appointments_org_starts_idx").on(t.organizationId, t.startsAt),
    index("appointments_lead_idx").on(t.leadId),
  ],
);

/* ─────────────────── Integrations & connections ──────────────────── */

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("google"), // google | outlook
    accountEmail: text("account_email"),
    calendarId: text("calendar_id"),
    // encrypted at rest via credential envelope — never returned to the browser
    encryptedCredentials: text("encrypted_credentials"),
    status: text("status").notNull().default("disconnected"), // connected | disconnected | expired
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calendar_connections_org_idx").on(t.organizationId)],
);

export const crmConnections = pgTable(
  "crm_connections",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("webhook"), // gohighlevel | hubspot | webhook
    label: text("label"),
    encryptedCredentials: text("encrypted_credentials"),
    webhookUrl: text("webhook_url"),
    status: text("status").notNull().default("disconnected"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("crm_connections_org_idx").on(t.organizationId)],
);

export const providerConnections = pgTable(
  "provider_connections",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    providerType: providerTypeEnum("provider_type").notNull(),
    provider: text("provider").notNull(), // twilio, retell, resend…
    encryptedCredentials: text("encrypted_credentials"),
    config: jsonb("config"),
    status: text("status").notNull().default("disconnected"),
    lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("provider_connections_org_idx").on(t.organizationId)],
);

/* ───────────────── Notifications & messaging ─────────────────────── */

export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email"),
    recipientPhone: text("recipient_phone"),
    callSummaryEmail: boolean("call_summary_email").notNull().default(true),
    callSummarySms: boolean("call_summary_sms").notNull().default(false),
    crmNotification: boolean("crm_notification").notNull().default(false),
    highPriorityLeadAlert: boolean("high_priority_lead_alert").notNull().default(true),
    appointmentAlert: boolean("appointment_alert").notNull().default(true),
    failedBookingAlert: boolean("failed_booking_alert").notNull().default(true),
    missedTransferAlert: boolean("missed_transfer_alert").notNull().default(true),
    dailyDigest: boolean("daily_digest").notNull().default(false),
    weeklySummary: boolean("weekly_summary").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("notification_settings_org_idx").on(t.organizationId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    relatedCallId: text("related_call_id").references(() => callRecords.id, {
      onDelete: "set null",
    }),
    relatedLeadId: text("related_lead_id").references(() => leads.id, {
      onDelete: "set null",
    }),
    status: messageStatusEnum("status").notNull().default("queued"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_org_idx").on(t.organizationId)],
);

export const smsMessages = pgTable(
  "sms_messages",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callerId: text("caller_id").references(() => callers.id, { onDelete: "set null" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    relatedCallId: text("related_call_id").references(() => callRecords.id, {
      onDelete: "set null",
    }),
    direction: messageDirectionEnum("direction").notNull(),
    fromNumber: text("from_number").notNull(),
    toNumber: text("to_number").notNull(),
    body: text("body").notNull(),
    isTextBack: boolean("is_text_back").notNull().default(false),
    status: messageStatusEnum("status").notNull().default("queued"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sms_messages_org_idx").on(t.organizationId),
    index("sms_messages_provider_msg_idx").on(t.providerMessageId),
  ],
);

export const emailMessages = pgTable(
  "email_messages",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    relatedCallId: text("related_call_id").references(() => callRecords.id, {
      onDelete: "set null",
    }),
    direction: messageDirectionEnum("direction").notNull().default("outbound"),
    fromAddress: text("from_address").notNull(),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: messageStatusEnum("status").notNull().default("queued"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_messages_org_idx").on(t.organizationId)],
);

/* ─────────────── Transfers, escalations, webhooks ────────────────── */

export const transferRules = pgTable(
  "transfer_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id").references(() => aiReceptionists.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    transferNumber: text("transfer_number"),
    backupNumber: text("backup_number"),
    duringBusinessHoursOnly: boolean("during_business_hours_only").notNull().default(true),
    afterHoursBehavior: text("after_hours_behavior").default("take_message"),
    urgentKeywords: jsonb("urgent_keywords").$type<string[]>().default([]),
    vipCallerNumbers: jsonb("vip_caller_numbers").$type<string[]>().default([]),
    failureFallback: text("failure_fallback").default("take_message"),
    voicemailFallback: boolean("voicemail_fallback").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("transfer_rules_org_idx").on(t.organizationId)],
);

export const escalationRules = pgTable(
  "escalation_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    receptionistId: text("receptionist_id").references(() => aiReceptionists.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    triggerCondition: text("trigger_condition").notNull(), // emergency_keyword, low_confidence…
    action: text("action").notNull(), // transfer, alert_owner, end_call_with_guidance
    emergencyLanguage: text("emergency_language"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("escalation_rules_org_idx").on(t.organizationId)],
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    provider: text("provider").notNull(),
    eventKind: text("event_kind").notNull(), // incoming_call, transcript_ready…
    url: text("url").notNull(),
    secretRef: text("secret_ref"), // reference to env-stored secret, never the secret itself
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_endpoints_org_idx").on(t.organizationId)],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    eventKind: text("event_kind").notNull(),
    providerEventId: text("provider_event_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    status: webhookEventStatusEnum("status").notNull().default("received"),
    signatureValid: boolean("signature_valid"),
    // redacted payload; raw payloads only preserved when necessary for replay
    payload: jsonb("payload"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("webhook_events_idempotency_idx").on(t.idempotencyKey),
    index("webhook_events_provider_event_idx").on(t.providerEventId),
    index("webhook_events_org_idx").on(t.organizationId),
  ],
);

export const integrationLogs = pgTable(
  "integration_logs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    providerType: providerTypeEnum("provider_type").notNull(),
    provider: text("provider").notNull(),
    operation: text("operation").notNull(),
    relatedCallId: text("related_call_id"),
    relatedLeadId: text("related_lead_id"),
    success: boolean("success").notNull(),
    // structured, PII-redacted details only
    detail: jsonb("detail"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("integration_logs_org_idx").on(t.organizationId)],
);

/* ─────────────── Compliance, audit, retention ────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    // set when a platform admin acts on behalf of a tenant (impersonation)
    impersonatedByUserId: text("impersonated_by_user_id"),
    action: text("action").notNull(), // e.g. "receptionist.publish", "lead.export"
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    detail: jsonb("detail"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_org_idx").on(t.organizationId),
    index("audit_logs_actor_idx").on(t.actorUserId),
  ],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    callerId: text("caller_id").references(() => callers.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    consentType: consentTypeEnum("consent_type").notNull(),
    granted: boolean("granted").notNull(),
    source: text("source"), // call, onboarding, sms_reply
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("consent_records_org_idx").on(t.organizationId)],
);

export const dataRetentionSettings = pgTable(
  "data_retention_settings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recordingRetentionDays: integer("recording_retention_days").notNull().default(90),
    transcriptRetentionDays: integer("transcript_retention_days").notNull().default(365),
    leadRetentionDays: integer("lead_retention_days"),
    recordingEnabled: boolean("recording_enabled").notNull().default(false),
    recordingDisclosure: text("recording_disclosure"),
    stateRecordingConfig: jsonb("state_recording_config"),
    legalDisclaimer: text("legal_disclaimer"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("data_retention_org_idx").on(t.organizationId)],
);

/* ─────────────── Onboarding, templates, flags ────────────────────── */

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(1),
    completedSteps: jsonb("completed_steps").$type<number[]>().default([]),
    isComplete: boolean("is_complete").notNull().default(false),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("onboarding_progress_org_idx").on(t.organizationId)],
);

export const industryTemplates = pgTable(
  "industry_templates",
  {
    id: text("id").primaryKey(),
    industry: industryEnum("industry").notNull(),
    name: text("name").notNull(),
    // greeting, faqs, qualification questions, appointment types, escalation
    // rules, disclaimers, business hours, required caller info, follow-ups
    template: jsonb("template").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("industry_templates_industry_idx").on(t.industry)],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    description: text("description"),
    enabledGlobally: boolean("enabled_globally").notNull().default(false),
    // per-org overrides: { [organizationId]: boolean }
    orgOverrides: jsonb("org_overrides").$type<Record<string, boolean>>().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("feature_flags_key_idx").on(t.key)],
);
