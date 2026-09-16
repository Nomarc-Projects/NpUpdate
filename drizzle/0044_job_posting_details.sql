-- Job-posting fields the Post-a-Job design asks for but the table cannot hold.
--
-- The `job` table stores requirements as one free-text blob, and has nowhere at
-- all for a currency, a skills list, a benefits list, or the "Requested
-- Documents" choices. The post form has therefore been a 3-step stepper with a
-- single Requirements textarea rather than the repeatable rows in the design.
--
-- `requirements` (text) is deliberately left in place rather than migrated.
-- Existing rows keep their prose, and readers fall back to splitting it on
-- newlines when `requirement_list` is empty, so nothing already posted loses
-- content or needs backfilling.
--
-- The three require_* flags are NULLABLE ON PURPOSE and have no default. NULL
-- means "posted before this existed": the apply form then behaves exactly as it
-- does today, showing every field and enforcing none. Defaulting them to true
-- would retroactively make a résumé or cover letter mandatory on ~every job
-- already live and could block applicants who have neither on file.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0044_job_posting_details.sql
-- Run statement-by-statement (CockroachDB rejects indexing a column added in the
-- same implicit transaction).

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'NGN';

-- Mirrors project.responsibilities, already a text[].
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "requirement_list" text[];

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "skills" text[];

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "benefits" text[];

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "require_resume" boolean;

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "require_portfolio" boolean;

ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "require_cover_letter" boolean;
