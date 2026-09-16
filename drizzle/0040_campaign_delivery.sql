-- Per-recipient delivery ledger + email suppression list.
--
-- Two problems this fixes.
--
-- 1. sendCampaignNow() recorded only aggregate counters (sent_count /
--    failed_count). A blast that died partway left no record of WHO had already
--    received it, so the only safe options were "never retry" or "re-send to
--    everyone", and a 1,795-recipient send would silently double-mail whoever
--    was in the first batches. This ledger makes the send idempotent: a row per
--    (campaign, recipient), so a resumed run skips anyone already sent.
--
-- 2. app/(marketing)/privacy tells recipients they can unsubscribe via a link in
--    our emails, and the composer offers an {{unsubscribe_url}} token, but no
--    opt-out was ever stored anywhere. email_suppression is that store.
--
-- Keyed on email rather than user_id so an address can be suppressed even if it
-- is not (or is no longer) attached to an account.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0040_campaign_delivery.sql
-- NOTE: run statement-by-statement; CockroachDB rejects CREATE INDEX on a column
-- added in the same implicit transaction.

CREATE TABLE IF NOT EXISTS "email_campaign_delivery" (
  "campaign_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "email" text NOT NULL,
  -- pending | sent | failed
  "status" text NOT NULL DEFAULT 'pending',
  "error" text,
  "sent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("campaign_id", "user_id")
);

-- The drain's hot query: "give me the next N pending rows for this campaign".
CREATE INDEX IF NOT EXISTS "email_campaign_delivery_pending_idx"
  ON "email_campaign_delivery" ("campaign_id", "status");

CREATE TABLE IF NOT EXISTS "email_suppression" (
  "email" text PRIMARY KEY,
  "user_id" text,
  -- unsubscribe | bounce | complaint | manual
  "reason" text NOT NULL DEFAULT 'unsubscribe',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
