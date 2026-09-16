-- Directory > Lists table (image 64) needs a "Last Modified" column.
-- Additive only.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0021_list_updated_at.sql

ALTER TABLE "list" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
