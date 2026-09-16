-- Company registration number, editable on the company profile.
--
-- Exhibitor onboarding already asks for it, but submitted it only as a KYC
-- document (`cac_number` on kyc_document) — so the value lived in a review
-- queue and the company profile had nowhere to show or change it. The
-- redesigned Company Profile puts it on the form beside Company Address.
--
-- The KYC document remains the verification artefact; this column is the
-- displayed, owner-editable value.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0035_company_registration_number.sql

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "registration_number" text;
