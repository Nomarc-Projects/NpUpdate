-- Homepage slider order + Nomarc Ads Board house slide.
--
-- Slide order (sort_order asc): 1) Nomarc Ads Board house slide leads, 2)
-- Titan SteelCo, 3) Award-Winning Sustainable Residential Architecture,
-- 4) Modern Residential Building.
--
-- The house "Advertise on Nomarc" slide used to exist only as the empty-state
-- fallback in promoted-listings.tsx, which never rendered while any real
-- advert was active. As a real row it rotates in the slider and stays editable
-- from the admin Ads console. Both CTAs point at the Ads Board (/dashboard/
-- promotions) — there is no public pricing page yet.
-- Idempotent: guarded inserts + unconditional (stable) ordering updates.
-- Apply: node scripts/apply-migration.cjs drizzle/0046_house_ad_slide.sql

UPDATE "advert" SET "sort_order" = 1 WHERE "heading" = 'West Africa''s Premier Steel Supplier';--> statement-breakpoint
UPDATE "advert" SET "sort_order" = 2 WHERE "heading" = 'Award-Winning Sustainable Residential Architecture';--> statement-breakpoint
UPDATE "advert" SET "sort_order" = 3 WHERE "heading" = 'Modern Residential Building';--> statement-breakpoint

INSERT INTO "advert" ("heading", "body", "badge", "promoted_name", "promoted_meta", "avatar_url", "cta_label", "cta_href", "cta_label_2", "cta_href_2", "image_url", "accent", "active", "sort_order")
SELECT
  'Showcase your brand to the Global AEC Industry',
  'Put your brand in front of thousands of active professionals and firms. Claim this spot to drive targeted traffic, generate high-quality leads, and grow your network.',
  'Advertise on Nomarc',
  'Nomarc Ads Board',
  'Targeted Reach · Premium Visibility',
  NULL,
  'View Ad Plans', '/dashboard/promotions',
  'Go to Ads Board', '/dashboard/promotions',
  '/media/ads/default.webp',
  '#ffd716', true, 0
WHERE NOT EXISTS (SELECT 1 FROM "advert" WHERE "heading" = 'Showcase your brand to the Global AEC Industry');
