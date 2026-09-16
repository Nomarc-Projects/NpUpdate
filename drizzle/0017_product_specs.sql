-- Exhibition Hub Phase B — persist product specs + thread variant selection
-- through to order line items. Additive + idempotent.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0017_product_specs.sql

ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "specs" jsonb;
--> statement-breakpoint
ALTER TABLE "order_item" ADD COLUMN IF NOT EXISTS "variant_id" uuid REFERENCES "product_variant"("id") ON DELETE SET NULL;
