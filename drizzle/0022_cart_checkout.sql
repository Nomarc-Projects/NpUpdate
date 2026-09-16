-- Exhibition Hub cart/checkout (M4/M5): country on saved addresses, and
-- generic "kind"/"payload" columns on payment_transaction so a single table
-- can settle both subscription billing (kind='billing', existing behaviour)
-- and multi-vendor cart checkouts (kind='cart', payload = JSON cart snapshot
-- used to reconstruct sales_order/order_item rows once payment clears).
-- Additive only.
-- Apply (dev only): doppler run -p nomarc -c dev --fallback-only -- node scripts/apply-migration.cjs drizzle/0022_cart_checkout.sql

ALTER TABLE "buyer_address" ADD COLUMN IF NOT EXISTS "country" text;

ALTER TABLE "payment_transaction" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'billing';
ALTER TABLE "payment_transaction" ADD COLUMN IF NOT EXISTS "payload" text;
