-- Two new campaign audiences: explicit recipients, and more than one segment.
--
-- email_campaign could express "one built-in audience key" OR "exactly one
-- saved segment" (segment_id, a single uuid). It had nowhere to record a
-- hand-picked list of people, and nowhere to record a second segment, so
-- "Custom recipients" and "Segments" had no storage to land in.
--
-- segment_id is deliberately left in place: existing rows still use it, and
-- resolveRecipients keeps honouring it, so nothing already saved changes meaning.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0042_campaign_audience.sql
-- Run statement-by-statement.

-- Explicit user ids for audience_key = 'custom'. text[] to match "user".id,
-- which Better Auth stores as text rather than uuid.
ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "recipient_user_ids" text[];

-- One or more saved segments for audience_key = 'segments'.
ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "segment_ids" uuid[];
