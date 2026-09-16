-- Professional practice status, and the fields it conditionally reveals.
--
-- The redesigned Personal Profile adds a "Professional practice status"
-- dropdown (Intern/apprentice, Graduate, Consultant/Freelancer, Licensed,
-- Company). Picking "Licensed" reveals a license number; picking "Company"
-- reveals company name, registration number, address and bio.
--
-- These sit on `profile` rather than reusing the `company` table: that table is
-- the exhibitor's storefront (catalog, verification, subscription), whereas
-- these describe how an individual practises. Conflating them would give every
-- professional who ticks "Company" a phantom exhibitor storefront.
--
-- All nullable and additive — an existing profile keeps a NULL status and the
-- form falls back to showing no conditional fields.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0033_profile_practice_status.sql

ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "practice_status" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "license_number" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "practice_company_name" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "practice_reg_number" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "practice_company_address" text;
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "practice_company_bio" text;
