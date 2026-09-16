-- A billing period, so a downgrade can take effect at the end of one.
--
-- The Confirm Downgrade modal promises "you will keep your current limits until
-- your billing cycle ends on [Date]", and the contact page has promised the
-- same thing for months. Neither was implementable: there was no subscription
-- period anywhere — no table, no current_period_end — and cancelPlan flipped
-- the plan to free immediately. The billing page's "Ends at cycle end" label
-- was rendered from local UI state, not data.
--
-- Stored on user_role rather than a new subscription table because a plan is
-- already per-role there, and every read path (entitlements, getTrialState,
-- setRolePlan) resolves through that row. A parallel table would need all of
-- them to learn about it.
--
--   current_period_end  when the paid term expires; renewal is manual today, so
--                       this is also when access lapses if nothing is paid.
--   pending_plan        the tier to drop to at period end. NULL = no scheduled
--                       change. An upgrade clears it — paying for a higher tier
--                       cancels a queued downgrade.
--
-- Additive and nullable; rows with no period behave exactly as before.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0038_billing_period.sql

ALTER TABLE "user_role" ADD COLUMN IF NOT EXISTS "current_period_end" timestamptz;
ALTER TABLE "user_role" ADD COLUMN IF NOT EXISTS "pending_plan" text;

-- Drives the sweep that applies scheduled downgrades.
CREATE INDEX IF NOT EXISTS "user_role_period_end_idx"
  ON "user_role" ("current_period_end") WHERE "pending_plan" IS NOT NULL;
