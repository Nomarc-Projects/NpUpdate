-- Manual email audience for email campaigns.
--
-- audience_key = 'manual' lets an admin type a list of arbitrary email addresses
-- (not tied to existing user accounts). recipient_user_ids is a text[] keyed on
-- user ids, so it can't hold those addresses without abusing its meaning —
-- manual_emails is their dedicated store.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0055_manual_email_recipients.sql
-- Run statement-by-statement.

ALTER TABLE "email_campaign" ADD COLUMN IF NOT EXISTS "manual_emails" text[];