-- Social layer: one-way follow (network) + lightweight presence (last seen).
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0012_social_follow_presence.sql

CREATE TABLE IF NOT EXISTS "follow" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "follower_id" TEXT NOT NULL,
  "followee_id" TEXT NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No self-follow duplicates; fast lookups both directions.
CREATE UNIQUE INDEX IF NOT EXISTS "follow_pair_uidx" ON "follow" ("follower_id", "followee_id");
CREATE INDEX IF NOT EXISTS "follow_followee_idx" ON "follow" ("followee_id");

-- Presence: when the user was last active (heartbeat updates this).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ;
