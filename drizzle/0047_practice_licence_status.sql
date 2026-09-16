--> Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0047_practice_licence_status.sql

--> "Professional practice status" (registered | in_progress | not_licensed)
--> collected on the find-work onboarding under Qualification.

ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "practice_licence_status" text;--> statement-breakpoint