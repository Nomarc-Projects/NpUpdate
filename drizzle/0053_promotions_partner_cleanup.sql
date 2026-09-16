-- Promotions: partnership flag + placeholder-content cleanup.
--
-- 1) `user.is_partner` — admin-managed flag granting promotion rights on
--    accounts that don't hold the Key players exhibitor plan. Promotions
--    (paid campaigns) are restricted to Exhibition Hub premium (key_player)
--    subscribers and Nomarc partners; this flag is the partner half of that
--    gate, toggled from Admin > User Management > All Users.
-- 2) Removes the placeholder seed rows that made the homepage Promotions
--    section look real when it wasn't: the three fake cards (Sandra James x2,
--    Titan SteelCo) from drizzle/0015 and the "Advertise on Nomarc" house slide
--    from drizzle/0046. The promoted slider/banner now renders nothing until an
--    admin publishes actual content from the Ads console (/admin/adverts).
-- Idempotent.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0053_promotions_partner_cleanup.sql

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_partner" boolean NOT NULL DEFAULT false;--> statement-breakpoint

DELETE FROM "advert"
WHERE "heading" IN (
  'Award-Winning Sustainable Residential Architecture',
  'Modern Residential Building',
  'West Africa''s Premier Steel Supplier',
  'West Africa'' Premier Steel Supplier',
  'Showcase your brand to the Global AEC Industry'
);