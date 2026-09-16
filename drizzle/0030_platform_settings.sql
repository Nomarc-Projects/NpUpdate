-- Platform-wide settings, keyed. Introduced for maintenance mode: during the
-- nomarcprojects.com cutover the site must be hidden from everyone except
-- admins, and that switch has to survive a deploy and be flippable from the
-- admin console rather than by editing an env var and redeploying.
--
-- Deliberately a key/jsonb bag rather than a column-per-setting table. The
-- admin Settings page (app/admin/settings) is currently a client-side mock with
-- nothing behind it; when its rows get wired up they land here as new keys with
-- no further migrations. `key` is the primary key, so a setting is read with a
-- single point lookup and written with an upsert.
--
-- Additive + idempotent; creates one new table and touches nothing existing.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0030_platform_settings.sql

CREATE TABLE IF NOT EXISTS "platform_setting" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text
);--> statement-breakpoint

-- Seed maintenance mode in the OFF state so the very first read after this
-- migration returns a real row rather than relying on the service's fallback.
-- ON CONFLICT keeps a re-run from clobbering a live toggle.
INSERT INTO "platform_setting" ("key", "value") VALUES (
  'maintenance',
  '{"enabled": false, "headline": "We will be back shortly", "message": "Nomarc Projects is offline for a short, planned update. Your account and data are safe, and everything will be exactly where you left it.", "etaText": "", "allowEmails": []}'::jsonb
) ON CONFLICT ("key") DO NOTHING;
