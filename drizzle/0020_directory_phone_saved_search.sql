-- Directory rebuild support: (1) `phone` on profile/company — every People/
-- Companies screenshot shows a copy-chip phone column that has no backing
-- column today; (2) `saved_search` — the "My searches" control (save/recent
-- searches) on the People/Companies directory tables.
-- Additive only — no ALTER/DROP on existing data.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0020_directory_phone_saved_search.sql

ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "saved_search" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "kind" text NOT NULL,
  "name" text,
  "query" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "saved_search_user_kind_idx" ON "saved_search" ("user_id", "kind", "created_at" DESC);
