ALTER TABLE "business_profiles" ADD COLUMN "text_back_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD COLUMN "text_back_message" text;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD COLUMN "text_back_cooldown_hours" integer DEFAULT 24 NOT NULL;