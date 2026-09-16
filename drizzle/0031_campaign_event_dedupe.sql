-- Bound email_campaign_event to one row per recipient action.
--
-- /api/email/open and /api/email/click cannot require a session (a mail client
-- has none), so they only insert. Nothing stopped the same recipient's pixel or
-- link being fetched repeatedly, which meant unbounded row growth from an
-- unauthenticated endpoint and open/click counts that drifted upward on their
-- own. The rate queries already de-duplicate with COUNT(DISTINCT user_id), so
-- enforcing it at write time changes no reported figure — it just stops the
-- table carrying rows nobody reads.
--
-- Two partial indexes rather than one: an open has no URL, while a click is only
-- a duplicate if it is the same link. A single index over a nullable `url` would
-- not constrain opens at all, since NULLs never collide.
--
-- Existing duplicates are collapsed first (oldest row wins, by uuid order) or
-- the index creation would fail. Additive and re-runnable.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0031_campaign_event_dedupe.sql

DELETE FROM "email_campaign_event" e
WHERE e."kind" = 'open'
  AND EXISTS (
    SELECT 1 FROM "email_campaign_event" k
    WHERE k."campaign_id" = e."campaign_id"
      AND k."user_id" = e."user_id"
      AND k."kind" = 'open'
      AND k."id" < e."id"
  );--> statement-breakpoint

DELETE FROM "email_campaign_event" e
WHERE e."kind" = 'click'
  AND EXISTS (
    SELECT 1 FROM "email_campaign_event" k
    WHERE k."campaign_id" = e."campaign_id"
      AND k."user_id" = e."user_id"
      AND k."kind" = 'click'
      AND k."url" IS NOT DISTINCT FROM e."url"
      AND k."id" < e."id"
  );--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "email_campaign_event_open_unique"
  ON "email_campaign_event" ("campaign_id", "user_id")
  WHERE "kind" = 'open';--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "email_campaign_event_click_unique"
  ON "email_campaign_event" ("campaign_id", "user_id", "url")
  WHERE "kind" = 'click';
