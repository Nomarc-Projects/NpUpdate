-- Ad Board — unify the old "Adverts" banner + the hardcoded "Promoted listings"
-- into a single admin-managed promoted-card feature. Adds the promoted-card
-- fields (who is being promoted, avatar, secondary CTA) to the existing advert
-- table, then seeds the 3 previously-hardcoded sample cards so the Ad Board
-- page and homepage slider have real, editable content. Additive + idempotent.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0015_ad_board.sql

ALTER TABLE "advert" ADD COLUMN IF NOT EXISTS "promoted_name" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN IF NOT EXISTS "promoted_meta" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN IF NOT EXISTS "cta_label_2" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN IF NOT EXISTS "cta_href_2" text;--> statement-breakpoint

INSERT INTO "advert" ("heading", "body", "badge", "promoted_name", "promoted_meta", "avatar_url", "cta_label", "cta_href", "cta_label_2", "cta_href_2", "image_url", "accent", "active", "sort_order")
SELECT
  'Award-Winning Sustainable Residential Architecture',
  'Bringing over a decade of experience to modern, climate-responsive builds. Discover my latest portfolio of mixed-use and residential projects across Nigeria.',
  'Promoted',
  'Sandra James',
  'Graduate Architect · Lagos, Nigeria',
  'https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev/site/photo-1504307651254-35680f356dfd.jpg',
  'View Profile', '/directory',
  'Message Professional', '/messages',
  'https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev/site/photo-1503387762-592deb58ef4e.jpg',
  '#ffd716', true, 0
WHERE NOT EXISTS (SELECT 1 FROM "advert" WHERE "heading" = 'Award-Winning Sustainable Residential Architecture');--> statement-breakpoint

INSERT INTO "advert" ("heading", "body", "badge", "promoted_name", "promoted_meta", "avatar_url", "cta_label", "cta_href", "cta_label_2", "cta_href_2", "image_url", "accent", "active", "sort_order")
SELECT
  'Modern Residential Building',
  'Modern, eco-friendly residential complex featuring solar power, smart ventilation, and locally sourced materials.',
  'Promoted',
  'Sandra James',
  'Lead Architect · Lagos, Nigeria',
  'https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev/site/photo-1504307651254-35680f356dfd.jpg',
  'View Project', '/directory',
  'Message Professional', '/messages',
  'https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev/site/photo-1486325212027-8081e485255e.jpg',
  '#ffd716', true, 1
WHERE NOT EXISTS (SELECT 1 FROM "advert" WHERE "heading" = 'Modern Residential Building');--> statement-breakpoint

INSERT INTO "advert" ("heading", "body", "badge", "promoted_name", "promoted_meta", "avatar_url", "cta_label", "cta_href", "cta_label_2", "cta_href_2", "image_url", "accent", "active", "sort_order")
SELECT
  'West Africa''s Premier Steel Supplier',
  'Supplying 50k metric tons monthly of structural steel and rebar for heavy civil and commercial engineering projects.',
  'Promoted',
  'Titan SteelCo',
  'Core Building Materials · Ikeja, Lagos, Nigeria',
  NULL,
  'View Profile', '/directory',
  'Message', '/messages',
  'https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev/site/photo-1541888946425-d81bb19240f5.jpg',
  '#ffd716', true, 2
WHERE NOT EXISTS (SELECT 1 FROM "advert" WHERE "heading" = 'West Africa''s Premier Steel Supplier');
