-- Portfolio project fields the Add-New-Project form has always collected but had
-- nowhere to go.
--
-- The `project` table already had title/role/description/location/cover/gallery,
-- but the form also asks for a start and end date, an "ongoing" flag and a list
-- of key responsibilities. None of those had a column, which was academic until
-- now because the form never saved anything at all; it toasted "Project
-- published!" and navigated away.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0041_project_details.sql
-- Run statement-by-statement (CockroachDB rejects indexing a column added in the
-- same implicit transaction).

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "start_date" date;

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "end_date" date;

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "ongoing" boolean NOT NULL DEFAULT false;

-- Mirrors project.gallery, which is already a text[].
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "responsibilities" text[];

-- Every read is "this user's projects, newest first".
CREATE INDEX IF NOT EXISTS "project_user_created_idx" ON "project" ("user_id", "created_at" DESC);
