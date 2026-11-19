-- Records explicit Terms/Privacy acceptance per user (versioned, timestamped).
--
-- Used for signup consent proof and to re-prompt users when CURRENT_TERMS_VERSION changes.
--
-- Apply on the VPS with the same DATABASE_URL the app uses:
--   DATABASE_URL='postgresql://…' node scripts/apply-migration.cjs drizzle/0068_terms_acceptance.sql

CREATE TABLE IF NOT EXISTS "user_terms_acceptance" (
  "user_id" text PRIMARY KEY NOT NULL,
  "terms_version" text NOT NULL,
  "accepted_at" timestamp with time zone NOT NULL DEFAULT now()
);
