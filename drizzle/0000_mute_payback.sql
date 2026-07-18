CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show', 'failed');--> statement-breakpoint
CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."call_outcome" AS ENUM('appointment_booked', 'lead_captured', 'message_taken', 'call_transferred', 'faq_resolved', 'caller_disconnected', 'spam', 'disqualified', 'emergency_escalation', 'booking_failed', 'transfer_failed', 'follow_up_required');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('ringing', 'in_progress', 'completed', 'missed', 'abandoned', 'failed');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('call_recording', 'sms_marketing', 'sms_transactional', 'data_processing', 'terms_of_service');--> statement-breakpoint
CREATE TYPE "public"."industry" AS ENUM('realtor', 'home_services', 'med_spa', 'salon', 'law_office', 'church', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_classification" AS ENUM('hot', 'warm', 'cold', 'disqualified', 'existing_customer', 'vendor', 'spam');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'appointment_booked', 'follow_up_required', 'won', 'lost', 'disqualified');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'delivered', 'failed', 'received');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'crm', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('basic', 'growth', 'premium');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('voice', 'telephony', 'sms', 'calendar', 'crm', 'email', 'automation_webhook');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('short_text', 'long_text', 'yes_no', 'number', 'date', 'time', 'multiple_choice', 'address', 'email', 'phone', 'service_type', 'budget_range', 'urgency_level');--> statement-breakpoint
CREATE TYPE "public"."receptionist_status" AS ENUM('draft', 'active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'canceled', 'complimentary');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'synced', 'failed', 'retrying', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."usage_type" AS ENUM('voice_minutes', 'phone_numbers', 'sms_messages', 'ai_processing', 'call_recordings', 'transcription_minutes', 'calendar_bookings', 'crm_sync_operations', 'premium_workflow_executions');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'agency_admin', 'owner', 'manager', 'member', 'read_only');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('received', 'processing', 'processed', 'failed', 'duplicate', 'invalid_signature');--> statement-breakpoint
CREATE TABLE "ai_receptionists" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "receptionist_status" DEFAULT 'draft' NOT NULL,
	"voice_id" text,
	"tone" text DEFAULT 'warm_friendly' NOT NULL,
	"greeting" text,
	"speaking_speed" numeric(3, 2) DEFAULT '1.00',
	"formality" text DEFAULT 'professional',
	"language" text DEFAULT 'en-US' NOT NULL,
	"pronunciation_notes" text,
	"call_goals" jsonb DEFAULT '[]'::jsonb,
	"restricted_topics" jsonb DEFAULT '[]'::jsonb,
	"compliance_statements" jsonb DEFAULT '[]'::jsonb,
	"business_knowledge" text,
	"confirmation_template" text,
	"follow_up_template" text,
	"summary_format" text,
	"active_version_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_types" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"location" text,
	"virtual_meeting_link" text,
	"min_notice_hours" integer DEFAULT 2 NOT NULL,
	"assigned_user_id" text,
	"confirmation_message" text,
	"reminder_message" text,
	"rescheduling_policy" text,
	"cancellation_policy" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"appointment_type_id" text,
	"lead_id" text,
	"call_record_id" text,
	"caller_name" text,
	"caller_phone" text,
	"service" text,
	"assigned_user_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"confirmation_sent" boolean DEFAULT false NOT NULL,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"calendar_sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"crm_sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"calendar_event_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"actor_user_id" text,
	"impersonated_by_user_id" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"detail" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"opens_at" text,
	"closes_at" text,
	"is_closed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"business_name" text NOT NULL,
	"website" text,
	"main_phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text DEFAULT 'US',
	"time_zone" text DEFAULT 'America/New_York' NOT NULL,
	"service_areas" jsonb DEFAULT '[]'::jsonb,
	"primary_contact_name" text,
	"primary_contact_email" text,
	"notification_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"account_email" text,
	"calendar_id" text,
	"encrypted_credentials" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"call_record_id" text NOT NULL,
	"event_type" text NOT NULL,
	"detail" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"call_record_id" text NOT NULL,
	"provider" text,
	"provider_recording_id" text,
	"storage_ref" text,
	"duration_seconds" integer,
	"consent_captured" boolean DEFAULT false NOT NULL,
	"retain_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_records" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text,
	"phone_number_id" text,
	"caller_id" text,
	"lead_id" text,
	"direction" "call_direction" DEFAULT 'inbound' NOT NULL,
	"status" "call_status" DEFAULT 'completed' NOT NULL,
	"outcome" "call_outcome",
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"sentiment" text,
	"urgency" text,
	"is_unread" boolean DEFAULT true NOT NULL,
	"assigned_user_id" text,
	"provider_call_id" text,
	"provider" text,
	"error_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"call_record_id" text NOT NULL,
	"sms_summary" text,
	"detailed_summary" text,
	"reason_for_calling" text,
	"services_requested" jsonb DEFAULT '[]'::jsonb,
	"recommended_next_action" text,
	"follow_up_deadline" timestamp with time zone,
	"sentiment" text,
	"compliance_concern" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_transcripts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"call_record_id" text NOT NULL,
	"segments" jsonb NOT NULL,
	"provider" text,
	"provider_transcript_id" text,
	"retain_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "callers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"email" text,
	"company" text,
	"sms_opted_out" boolean DEFAULT false NOT NULL,
	"sms_opted_out_at" timestamp with time zone,
	"last_text_back_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"caller_id" text,
	"user_id" text,
	"consent_type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"source" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text DEFAULT 'webhook' NOT NULL,
	"label" text,
	"encrypted_credentials" text,
	"webhook_url" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_retention_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"recording_retention_days" integer DEFAULT 90 NOT NULL,
	"transcript_retention_days" integer DEFAULT 365 NOT NULL,
	"lead_retention_days" integer,
	"recording_enabled" boolean DEFAULT false NOT NULL,
	"recording_disclosure" text,
	"state_recording_config" jsonb,
	"legal_disclaimer" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text,
	"related_call_id" text,
	"direction" "message_direction" DEFAULT 'outbound' NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text,
	"name" text NOT NULL,
	"trigger_condition" text NOT NULL,
	"action" text NOT NULL,
	"emergency_language" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" text,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"escalate_if_unanswered" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"enabled_globally" boolean DEFAULT false NOT NULL,
	"org_overrides" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holiday_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"holiday_date" date NOT NULL,
	"is_closed" boolean DEFAULT true NOT NULL,
	"opens_at" text,
	"closes_at" text
);
--> statement-breakpoint
CREATE TABLE "industry_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"industry" "industry" NOT NULL,
	"name" text NOT NULL,
	"template" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"provider_type" "provider_type" NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"related_call_id" text,
	"related_lead_id" text,
	"success" boolean NOT NULL,
	"detail" jsonb,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"question_id" text,
	"question_prompt" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"author_user_id" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_scoring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"signal" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"caller_id" text,
	"name" text,
	"phone" text,
	"email" text,
	"company" text,
	"address" text,
	"call_reason" text,
	"requested_service" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"classification" "lead_classification" DEFAULT 'warm' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"assigned_user_id" text,
	"source" text DEFAULT 'ai_receptionist',
	"campaign" text,
	"crm_record_id" text,
	"crm_sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"crm_sync_error" text,
	"follow_up_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"recipient_name" text,
	"recipient_email" text,
	"recipient_phone" text,
	"call_summary_email" boolean DEFAULT true NOT NULL,
	"call_summary_sms" boolean DEFAULT false NOT NULL,
	"crm_notification" boolean DEFAULT false NOT NULL,
	"high_priority_lead_alert" boolean DEFAULT true NOT NULL,
	"appointment_alert" boolean DEFAULT true NOT NULL,
	"failed_booking_alert" boolean DEFAULT true NOT NULL,
	"missed_transfer_alert" boolean DEFAULT true NOT NULL,
	"daily_digest" boolean DEFAULT false NOT NULL,
	"weekly_summary" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"related_call_id" text,
	"related_lead_id" text,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb,
	"is_complete" boolean DEFAULT false NOT NULL,
	"activated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"industry" "industry" DEFAULT 'other' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_numbers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text,
	"e164" text NOT NULL,
	"label" text,
	"provider" text DEFAULT 'twilio' NOT NULL,
	"provider_number_id" text,
	"capabilities" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_features" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"limit_value" integer
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"tier" "plan_tier" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"monthly_price_cents" integer NOT NULL,
	"setup_fee_cents" integer DEFAULT 0 NOT NULL,
	"usage_based" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider_type" "provider_type" NOT NULL,
	"provider" text NOT NULL,
	"encrypted_credentials" text,
	"config" jsonb,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_flows" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_options" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"question_id" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_disqualifying" boolean DEFAULT false NOT NULL,
	"score_impact" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"prompt" text NOT NULL,
	"question_type" "question_type" DEFAULT 'short_text' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"condition" jsonb,
	"disqualifying_answer" text,
	"lead_score_impact" integer DEFAULT 0 NOT NULL,
	"internal_notes" text,
	"save_to_crm" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receptionist_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"label" text,
	"config_snapshot" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"caller_id" text,
	"lead_id" text,
	"related_call_id" text,
	"direction" "message_direction" NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"body" text NOT NULL,
	"is_text_back" boolean DEFAULT false NOT NULL,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"coupon_code" text,
	"manual_billing" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receptionist_id" text,
	"name" text NOT NULL,
	"transfer_number" text,
	"backup_number" text,
	"during_business_hours_only" boolean DEFAULT true NOT NULL,
	"after_hours_behavior" text DEFAULT 'take_message',
	"urgent_keywords" jsonb DEFAULT '[]'::jsonb,
	"vip_caller_numbers" jsonb DEFAULT '[]'::jsonb,
	"failure_fallback" text DEFAULT 'take_message',
	"voicemail_fallback" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"usage_type" "usage_type" NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"receptionist_id" text,
	"phone_number_id" text,
	"call_record_id" text,
	"period_start" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"provider" text NOT NULL,
	"event_kind" text NOT NULL,
	"url" text NOT NULL,
	"secret_ref" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"provider" text NOT NULL,
	"event_kind" text NOT NULL,
	"provider_event_id" text,
	"idempotency_key" text NOT NULL,
	"status" "webhook_event_status" DEFAULT 'received' NOT NULL,
	"signature_valid" boolean,
	"payload" jsonb,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_receptionists" ADD CONSTRAINT "ai_receptionists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointment_type_id_appointment_types_id_fk" FOREIGN KEY ("appointment_type_id") REFERENCES "public"."appointment_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_call_record_id_call_records_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_record_id_call_records_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_call_record_id_call_records_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_phone_number_id_phone_numbers_id_fk" FOREIGN KEY ("phone_number_id") REFERENCES "public"."phone_numbers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_caller_id_callers_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."callers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_records" ADD CONSTRAINT "call_records_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_summaries" ADD CONSTRAINT "call_summaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_summaries" ADD CONSTRAINT "call_summaries_call_record_id_call_records_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_transcripts" ADD CONSTRAINT "call_transcripts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_transcripts" ADD CONSTRAINT "call_transcripts_call_record_id_call_records_id_fk" FOREIGN KEY ("call_record_id") REFERENCES "public"."call_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "callers" ADD CONSTRAINT "callers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_caller_id_callers_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."callers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_retention_settings" ADD CONSTRAINT "data_retention_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_related_call_id_call_records_id_fk" FOREIGN KEY ("related_call_id") REFERENCES "public"."call_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_hours" ADD CONSTRAINT "holiday_hours_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_answers" ADD CONSTRAINT "lead_answers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_answers" ADD CONSTRAINT "lead_answers_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_answers" ADD CONSTRAINT "lead_answers_question_id_qualification_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qualification_questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_scoring_rules" ADD CONSTRAINT "lead_scoring_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_caller_id_callers_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."callers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_call_id_call_records_id_fk" FOREIGN KEY ("related_call_id") REFERENCES "public"."call_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_lead_id_leads_id_fk" FOREIGN KEY ("related_lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_flows" ADD CONSTRAINT "qualification_flows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_flows" ADD CONSTRAINT "qualification_flows_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_options" ADD CONSTRAINT "qualification_options_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_options" ADD CONSTRAINT "qualification_options_question_id_qualification_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."qualification_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_questions" ADD CONSTRAINT "qualification_questions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_questions" ADD CONSTRAINT "qualification_questions_flow_id_qualification_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."qualification_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receptionist_versions" ADD CONSTRAINT "receptionist_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receptionist_versions" ADD CONSTRAINT "receptionist_versions_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receptionist_versions" ADD CONSTRAINT "receptionist_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_caller_id_callers_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."callers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_related_call_id_call_records_id_fk" FOREIGN KEY ("related_call_id") REFERENCES "public"."call_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_rules" ADD CONSTRAINT "transfer_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_rules" ADD CONSTRAINT "transfer_rules_receptionist_id_ai_receptionists_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."ai_receptionists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_receptionists_org_idx" ON "ai_receptionists" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointment_types_org_idx" ON "appointment_types" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointments_org_idx" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointments_org_starts_idx" ON "appointments" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_lead_idx" ON "appointments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "audit_logs_org_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_org_day_idx" ON "business_hours" USING btree ("organization_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_org_idx" ON "business_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "calendar_connections_org_idx" ON "calendar_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "call_events_call_idx" ON "call_events" USING btree ("call_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_recordings_call_idx" ON "call_recordings" USING btree ("call_record_id");--> statement-breakpoint
CREATE INDEX "call_records_org_idx" ON "call_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "call_records_org_started_idx" ON "call_records" USING btree ("organization_id","started_at");--> statement-breakpoint
CREATE INDEX "call_records_provider_call_idx" ON "call_records" USING btree ("provider_call_id");--> statement-breakpoint
CREATE INDEX "call_records_caller_idx" ON "call_records" USING btree ("caller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_summaries_call_idx" ON "call_summaries" USING btree ("call_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_transcripts_call_idx" ON "call_transcripts" USING btree ("call_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "callers_org_phone_idx" ON "callers" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX "callers_phone_idx" ON "callers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "consent_records_org_idx" ON "consent_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "crm_connections_org_idx" ON "crm_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_retention_org_idx" ON "data_retention_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_messages_org_idx" ON "email_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "escalation_rules_org_idx" ON "escalation_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "faqs_org_idx" ON "faqs" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("key");--> statement-breakpoint
CREATE INDEX "holiday_hours_org_idx" ON "holiday_hours" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "industry_templates_industry_idx" ON "industry_templates" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "integration_logs_org_idx" ON "integration_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "lead_answers_lead_idx" ON "lead_answers" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_notes_lead_idx" ON "lead_notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_scoring_rules_org_idx" ON "lead_scoring_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_tags_lead_tag_idx" ON "lead_tags" USING btree ("lead_id","tag");--> statement-breakpoint
CREATE INDEX "lead_tags_org_idx" ON "lead_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "leads_org_idx" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "leads_org_status_idx" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "leads_crm_record_idx" ON "leads" USING btree ("crm_record_id");--> statement-breakpoint
CREATE INDEX "leads_crm_sync_status_idx" ON "leads" USING btree ("crm_sync_status");--> statement-breakpoint
CREATE INDEX "notification_settings_org_idx" ON "notification_settings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "notifications_org_idx" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_progress_org_idx" ON "onboarding_progress" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_user_idx" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "org_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "phone_numbers_e164_idx" ON "phone_numbers" USING btree ("e164");--> statement-breakpoint
CREATE INDEX "phone_numbers_org_idx" ON "phone_numbers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_features_plan_key_idx" ON "plan_features" USING btree ("plan_id","feature_key");--> statement-breakpoint
CREATE INDEX "provider_connections_org_idx" ON "provider_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "qualification_flows_org_idx" ON "qualification_flows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "qualification_options_question_idx" ON "qualification_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "qualification_questions_org_idx" ON "qualification_questions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "qualification_questions_flow_idx" ON "qualification_questions" USING btree ("flow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receptionist_versions_unique_idx" ON "receptionist_versions" USING btree ("receptionist_id","version_number");--> statement-breakpoint
CREATE INDEX "receptionist_versions_org_idx" ON "receptionist_versions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sms_messages_org_idx" ON "sms_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sms_messages_provider_msg_idx" ON "sms_messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "transfer_rules_org_idx" ON "transfer_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "usage_records_org_idx" ON "usage_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "usage_records_org_type_period_idx" ON "usage_records" USING btree ("organization_id","usage_type","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_org_idx" ON "webhook_endpoints" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_idempotency_idx" ON "webhook_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_event_idx" ON "webhook_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_org_idx" ON "webhook_events" USING btree ("organization_id");