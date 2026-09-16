-- Exhibitor free trial: one published product for the first 30 days.
--
-- Exhibitors could previously publish an unlimited catalogue for free. The
-- allowance is now one live listing during a 30-day window that starts when the
-- company record is created; once it lapses without a subscription, that
-- exhibitor's active products revert to draft and can't be republished.
--
-- `trial_started_at` is the window's anchor. Existing companies are backfilled
-- to their own `created_at` rather than to now(), so nobody who signed up months
-- ago is handed a brand-new 30 days — most will already be past the window,
-- which is the honest reading of "your first 30 days".
--
-- Additive + idempotent; no existing column or row is destroyed. The UPDATE only
-- touches rows where the column is still NULL, so a re-run is a no-op.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0029_exhibitor_trial.sql

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "trial_started_at" timestamp with time zone;--> statement-breakpoint

UPDATE "company" SET "trial_started_at" = "created_at" WHERE "trial_started_at" IS NULL;
