--> Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0048_profile_registration_number.sql

--> "Registered" professional practice status needs a registration number on
--> the profile, distinct from the per-body professional_registration table.

ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "registration_number" text;--> statement-breakpoint