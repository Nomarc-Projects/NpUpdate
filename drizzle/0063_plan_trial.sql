-- 14-day free trial for any plan (professional or exhibitor).
--
-- Adds trial tracking to user_role so any role can trial any paid tier.
-- The trial is per-role/plan combination: a user can trial "pro" as a
-- professional and separately trial "exhibitor" as an exhibitor.
--
-- Checked lazily on read (like the exhibitor trial sweep) — no cron needed.
-- When trial_ends_at passes, the plan reverts to free via the existing
-- sweepExpiredPlans pattern (pending_plan = "free").
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0063_plan_trial.sql

ALTER TABLE "user_role" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamptz;
ALTER TABLE "user_role" ADD COLUMN IF NOT EXISTS "trial_plan" text;

-- Index to find expiring trials efficiently if we ever add a sweep job.
CREATE INDEX IF NOT EXISTS "user_role_trial_ends_idx"
  ON "user_role" ("trial_ends_at") WHERE "trial_ends_at" IS NOT NULL;