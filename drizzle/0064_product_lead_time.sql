-- Lead time for made-to-order products.
--
-- Buyers need to know how long a made-to-order listing will take, so the
-- exhibitor editor now requires a lead time (value + unit) whenever a product
-- is set to "made_to_order". Existing made-to-order rows have no lead time yet
-- and will be prompted for one the next time they are edited.
--
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0064_product_lead_time.sql

ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "lead_time_value" integer;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "lead_time_unit" text;
