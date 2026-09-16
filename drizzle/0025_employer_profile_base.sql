-- Base tables for the Account Settings rework + employer onboarding wizard:
-- employer_profile (employer analogue of `company`), phone_otp (Account
-- Settings "Verify/Edit Number" flows), notification_preference (Account
-- Settings "Email Notifications" tab). These were added to lib/db/schema.ts
-- but never had a base CREATE TABLE migration — 0024_employer_profile_identity.sql
-- ALTERs employer_profile and depends on it existing, so this must run first.
-- Additive only — no ALTER/DROP on existing tables.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0025_employer_profile_base.sql

CREATE TABLE IF NOT EXISTS "employer_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "company_id" uuid REFERENCES "company"("id") ON DELETE SET NULL,
  "employer_type" text,
  "hiring_as" text,
  "contact_person" text,
  "phone" text,
  "phone_verified" boolean DEFAULT false,
  "email" text,
  "email_verified" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "employer_profile_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "phone_otp" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "phone" text NOT NULL,
  "code" text NOT NULL,
  "attempts" integer DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "phone_otp_user_id_role_idx" ON "phone_otp" ("user_id", "role");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notification_preference" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "prefs" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preference_user_id_unique" UNIQUE("user_id")
);
