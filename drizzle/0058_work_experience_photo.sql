-- Work experience photo: each work_experience row can carry one photo of the
-- work/project the role delivered, uploaded by the member from the Experience
-- tab on their profile (or attached when adding the role).
--
-- Pure additive column; safe to re-run (IF NOT EXISTS).
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0058_work_experience_photo.sql
ALTER TABLE "work_experience" ADD COLUMN IF NOT EXISTS "work_photo" text;