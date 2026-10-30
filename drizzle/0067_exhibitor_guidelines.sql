-- Exhibitor guideline acceptance for the Add Product funnel.
--
-- The Exhibition Hub guidelines (versioned copy shown in the onboarding
-- wizard) must be accepted before a new user is sent to subscription plans.
-- One row per user; re-acceptance updates the version and timestamp.
--
-- Apply: doppler run -p nomarc_projects -c prd -- node scripts/apply-migration.cjs drizzle/0067_exhibitor_guidelines.sql

CREATE TABLE IF NOT EXISTS "exhibitor_guideline_acceptance" (
  "user_id" text PRIMARY KEY NOT NULL,
  "guideline_version" text NOT NULL DEFAULT '2026-07-10',
  "accepted_at" timestamp with time zone NOT NULL DEFAULT now()
);
