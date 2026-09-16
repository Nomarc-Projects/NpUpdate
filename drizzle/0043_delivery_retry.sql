-- Bounded retry with backoff for transient delivery failures.
--
-- Previously a failed recipient was marked 'failed' permanently the first time
-- sendEmail rejected. That is right for hard bounces (unknown address, mailbox
-- full — retrying them forever would stall the queue) but wrong for transient
-- failures (SMTP connection timeout, 5xx server error, "too many connections"):
-- those clear up and the address deserves another chance.
--
-- Adds a per-recipient attempt counter and a backoff timestamp. The drain's
-- pending query now only picks rows whose backoff has elapsed, so a transient
-- failure is retried up to MAX_ATTEMPTS (3) with exponential spacing (~5 min,
-- then ~10 min) before being given up on.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0043_delivery_retry.sql
-- NOTE: run statement-by-statement; CockroachDB rejects ALTER TABLE ADD COLUMN
-- and CREATE INDEX on the same implicit transaction.

ALTER TABLE "email_campaign_delivery" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "email_campaign_delivery" ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamptz;
