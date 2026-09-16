-- Paid promotions: duration, price, payment link, and a run window.
--
-- Promotions were free end to end — createPromotion inserted straight to
-- pending_review with no duration, price or payment. The design sells two
-- campaign lengths (1 week ₦5,000 / 1 month ₦18,000), promises the ad goes live
-- "immediately after Admin approval", and guarantees that a rejected ad's
-- payment is held as credit so it can be resubmitted at no extra cost.
--
-- New states around the existing ones:
--   draft          composed, not yet paid  (nothing charged, nothing queued)
--   pending_review paid, awaiting an admin (this is where money has changed hands)
--   active         approved; started_at/ends_at bound the run
--   completed      ran its course
--   rejected       admin declined; payment_reference survives so a resubmission
--                  reuses the paid slot instead of charging again
--
-- `status` stays free-text, as everywhere else in this schema, so the two new
-- values need no type change.
--
-- Existing rows are pre-payment-era: they are left exactly as they are, so
-- anything already approved keeps running and anything queued still reviews.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0037_promotion_payment.sql

ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "duration_days" integer;
-- Naira, matching payment_transaction.amount.
ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "amount" integer;
ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "payment_reference" text;
ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "paid_at" timestamptz;
-- Set on approval, not on payment — the run starts when the ad goes live.
ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "started_at" timestamptz;
ALTER TABLE "promotion" ADD COLUMN IF NOT EXISTS "ends_at" timestamptz;

-- Resolving a settled payment back to its campaign.
CREATE UNIQUE INDEX IF NOT EXISTS "promotion_payment_reference_idx"
  ON "promotion" ("payment_reference") WHERE "payment_reference" IS NOT NULL;

-- Sweeping campaigns whose window has closed.
CREATE INDEX IF NOT EXISTS "promotion_ends_at_idx"
  ON "promotion" ("ends_at") WHERE "status" = 'active';
