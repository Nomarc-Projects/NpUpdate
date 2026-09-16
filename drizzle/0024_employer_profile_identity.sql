-- Employer onboarding wizard, Branch B ("create a new hiring profile" with
-- no existing exhibitor company): the freestanding hiring profile needs its
-- own business-identity fields, not just contact info.
-- Depends on the `employer_profile` table existing (created separately).
-- Additive only — no ALTER/DROP on existing columns.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0024_employer_profile_identity.sql

ALTER TABLE "employer_profile" ADD COLUMN IF NOT EXISTS "name" text;--> statement-breakpoint
ALTER TABLE "employer_profile" ADD COLUMN IF NOT EXISTS "headquarters" text;--> statement-breakpoint
ALTER TABLE "employer_profile" ADD COLUMN IF NOT EXISTS "company_size" text;--> statement-breakpoint
ALTER TABLE "employer_profile" ADD COLUMN IF NOT EXISTS "year_founded" integer;--> statement-breakpoint
ALTER TABLE "employer_profile" ADD COLUMN IF NOT EXISTS "about" text;--> statement-breakpoint
ALTER TABLE "employer_profile" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
