-- Proof of qualification, "currently studying", and a review state for education.
--
-- The redesigned Add Education modal takes a Proof of Qualification upload
-- (degree, transcript or certificate) and an "I am currently studying here"
-- checkbox, then shows a "Document Submitted … approval usually takes 24-48
-- hours" confirmation. None of that had anywhere to live: the table held only
-- school/degree/field/years.
--
-- `status` mirrors the vocabulary already used by kyc_document (pending |
-- approved | rejected) so the admin review surfaces read the same way. Rows
-- with no proof attached stay NULL rather than defaulting to 'pending', so
-- existing entries are not dragged into a review queue that has no document to
-- review.
--
-- All nullable and additive.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0034_education_proof.sql

ALTER TABLE "education" ADD COLUMN IF NOT EXISTS "current" boolean DEFAULT false NOT NULL;
ALTER TABLE "education" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "education" ADD COLUMN IF NOT EXISTS "proof_url" text;
-- NULL = no proof submitted. pending | approved | rejected once one is.
ALTER TABLE "education" ADD COLUMN IF NOT EXISTS "proof_status" text;
ALTER TABLE "education" ADD COLUMN IF NOT EXISTS "proof_submitted_at" timestamptz;

CREATE INDEX IF NOT EXISTS "education_proof_status_idx"
  ON "education" ("proof_status", "proof_submitted_at" DESC);
