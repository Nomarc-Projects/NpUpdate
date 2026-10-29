-- Product delivery coverage selected by the exhibitor.
--
-- Existing products remain NULL until the exhibitor edits and chooses a
-- delivery option. The public catalog intentionally omits delivery badges for
-- those legacy rows.
--
-- Apply: doppler run -p nomarc_projects -c prd -- node scripts/apply-migration.cjs drizzle/0066_product_delivery.sql

ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "delivery_mode" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "delivery_states" text[];
