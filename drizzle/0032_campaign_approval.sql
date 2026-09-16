-- Super-admin approval gate for platform-wide email blasts.
--
-- Both blast tools guarded with a plain requireAdmin(), which accepts `admin`
-- as well as `super_admin`. Any admin could therefore mail every account on the
-- platform unilaterally, with no second pair of eyes and no record of who
-- authorised it. The redesign's Email Campaigns board shows a "Pending Review"
-- state between Draft and Scheduled/Sent, which is the queue this adds.
--
-- `status` stays free-text (the whole schema avoids pgEnum), so the new
-- 'pending_review' value needs no type change — only the approval columns are
-- new. Additive, nullable, and re-runnable.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0032_campaign_approval.sql

ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "submitted_by" text;
ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;
ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;
-- Set when a super admin sends it back; cleared on re-submission.
ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "rejection_reason" text;

-- Drives the review queue, which reads only the pending rows.
CREATE INDEX IF NOT EXISTS "email_campaign_pending_idx"
  ON "email_campaign" ("status", "submitted_at" DESC);
