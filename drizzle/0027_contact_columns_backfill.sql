-- Adds five columns that exist in lib/db/schema.ts but were never migrated, so
-- production had no trace of them.
--
-- Consequence in production: getUsers() selects c.contact_person, so BOTH
-- /admin/user-management/professionals and /exhibitors threw
-- `column "c.contact_person" does not exist` in the Server Components render —
-- surfacing as a bare "Something went wrong" with a 503 on the RSC request.
-- getAccountInfo() reads the company/profile phone-verified and company email
-- columns for the exhibitor + employer account settings sections, so those were
-- on the same footing.
--
-- Verified absent against prd before writing this (information_schema):
--   company: no contact_person / phone_verified / email / email_verified
--   profile: no phone_verified
-- Everything else the schema declares was already present.
--
-- Additive only — IF NOT EXISTS throughout, so re-running is a no-op and no
-- existing data is touched. Booleans default false rather than NULL to match the
-- drizzle defaults (`boolean(...).default(false)`).
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0027_contact_columns_backfill.sql

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "contact_person" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false;
