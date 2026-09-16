-- Communications: saved audience segments + email campaigns (admin CRM).
-- Segments are reusable, rule-based user lists; campaigns target either a saved
-- segment or a built-in audience, and record their own delivery + engagement
-- counters. Opens/clicks land in `email_campaign_event`, one row per recipient
-- action, so a campaign's unique-open rate is derivable rather than guessed.
-- Additive only — no ALTER/DROP on existing tables.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0026_communications_crm.sql

CREATE TABLE IF NOT EXISTS "audience_segment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  -- Serialised SegmentRule[] (field/operator/value). Stored as JSON text so the
  -- rule vocabulary can grow without a migration per new field.
  "rules_json" text NOT NULL,
  -- 'all' = every rule must match (AND), 'any' = at least one (OR).
  "match_mode" text DEFAULT 'all' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_campaign" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  -- Internal tracking name; recipients never see this.
  "name" text NOT NULL,
  -- Exactly one of these drives the audience: a saved segment, else a built-in key.
  "segment_id" uuid,
  "audience_key" text DEFAULT 'all_users' NOT NULL,
  "subject" text NOT NULL,
  "preview_text" text,
  "from_name" text,
  "reply_to" text,
  "body_html" text DEFAULT '' NOT NULL,
  -- draft | scheduled | sending | sent | failed
  "status" text DEFAULT 'draft' NOT NULL,
  "scheduled_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "sent_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_campaign_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL,
  "user_id" text,
  -- open | click
  "kind" text NOT NULL,
  "url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "email_campaign_status_idx" ON "email_campaign" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_campaign_created_idx" ON "email_campaign" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_campaign_event_campaign_idx" ON "email_campaign_event" ("campaign_id");--> statement-breakpoint
-- Unique opens/clicks per recipient per campaign are counted with DISTINCT
-- user_id, so this pair is the hot lookup.
CREATE INDEX IF NOT EXISTS "email_campaign_event_kind_idx" ON "email_campaign_event" ("campaign_id", "kind");
