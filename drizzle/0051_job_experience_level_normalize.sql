-- Normalise legacy job experience_level values onto the shared vocabulary.
--
-- The post-job wizard, the Find Jobs filter and every edit surface once each
-- kept their own labels ("Entry level"/"Junior"/"Mid-level"/"Senior level" vs
-- "Entry level (0–2 yrs)"/"Intermediate (3–5 yrs)"/"Senior (6–9 yrs)"). The
-- surfaces now all read one canonical set (lib/experience-levels.ts), and the
-- admin moderation filter matches experience level by exact equality — so rows
-- still holding an old label would never be findable by it.
--
-- Value keys that never had a label mapping (a customer-typed value, a "Director
-- (10+ yrs)" already in the canonical set, NULL) are left untouched. Idempotent:
-- matching rows that are already canonical map to themselves.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0051_job_experience_level_normalize.sql

UPDATE "job" SET experience_level = 'Entry level (0–2 yrs)' WHERE experience_level IN ('Entry level', 'Junior');--> statement-breakpoint
UPDATE "job" SET experience_level = 'Intermediate (3–5 yrs)' WHERE experience_level IN ('Intermediate level', 'Mid-level');--> statement-breakpoint
UPDATE "job" SET experience_level = 'Senior (6–9 yrs)' WHERE experience_level IN ('Senior level', 'Senior');--> statement-breakpoint
UPDATE "job" SET experience_level = 'Director (10+ yrs)' WHERE experience_level = 'Director';