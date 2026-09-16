-- Exhibition Hub category cards get their own artwork. Until now a category's
-- image was borrowed from whichever product in it happened to sort first, so a
-- single listing's cover photo stood in for the whole category and changed
-- whenever the catalogue did. Admins now set the image (and the display name,
-- which taxonomy_term already stores) from Admin → Taxonomy.
-- Additive + idempotent; no existing column or row is touched.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0028_taxonomy_term_image.sql

ALTER TABLE "taxonomy_term" ADD COLUMN IF NOT EXISTS "image_url" text;
