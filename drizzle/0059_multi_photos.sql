-- Work experience: allow more than one work photo per entry.
-- Education: allow more than one certificate/proof document per entry.
-- Existing single-value columns are backfilled into the new jsonb arrays; the
-- legacy columns are left in place so older reads keep working untouched.
--
-- Pure additive columns; safe to re-run (IF NOT EXISTS).
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0059_multi_photos.sql

ALTER TABLE "work_experience" ADD COLUMN IF NOT EXISTS "work_photos" jsonb;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN IF NOT EXISTS "certificates" jsonb;--> statement-breakpoint
UPDATE "work_experience"
SET "work_photos" = jsonb_build_array("work_photo")
WHERE "work_photo" IS NOT NULL
  AND ("work_photos" IS NULL OR "work_photos" = '[]'::jsonb);--> statement-breakpoint
UPDATE "education"
SET "certificates" = jsonb_build_array(
  jsonb_build_object(
    'url', "proof_url",
    'status', COALESCE("proof_status", 'pending'),
    'submitted_at', NULL
  )
)
WHERE "proof_url" IS NOT NULL
  AND ("certificates" IS NULL OR "certificates" = '[]'::jsonb);