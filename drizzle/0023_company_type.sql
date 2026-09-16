-- Exhibitor onboarding: the Figma redesign's business-identity step adds a
-- "Company Type" dropdown (Manufacturer/Distributor/etc.) that has no home on
-- the existing company row.
-- Additive only — no ALTER/DROP on existing columns.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0023_company_type.sql

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "company_type" text;--> statement-breakpoint
