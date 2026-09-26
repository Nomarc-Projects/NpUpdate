-- Homepage "Trusted Clients" strip: move the companies off the hardcoded array
-- in logo-marquee.tsx and into the keyed jsonb bag (platform_setting, 0030), so
-- a super admin can curate them from /admin/platform/trusted-clients without a
-- deploy — the same treatment the Key Players strip already had.
--
-- The heading ("Trusted Clients") and the on/off switch become editable here
-- too; both used to be literals in partners.tsx.
--
-- The list is deliberately NOT seeded with the Key Players companies. Until
-- 0061-era the two were merged at render time, so every key player also
-- appeared here; they are independent now, and a company has to be added to
-- each deliberately.
--
-- ON CONFLICT keeps a re-run from clobbering a super admin's curation.
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0062_trusted_clients_setting.sql
INSERT INTO "platform_setting" ("key", "value") VALUES (
  'trusted_clients',
  '{"enabled": true, "heading": "Trusted Clients", "logos": [
    {"name": "FSB Real Estate", "src": "/logos/partners/fsb-real-estate.png", "href": ""},
    {"name": "Punuka", "src": "/logos/partners/punuka.png", "href": ""},
    {"name": "Sheraton", "src": "/logos/partners/sheraton.png", "href": ""},
    {"name": "Lagos State Government", "src": "/logos/partners/lagos-state.png", "href": ""},
    {"name": "DanBran Projects", "src": "/logos/partners/danbran.png", "href": ""}
  ]}'::jsonb
) ON CONFLICT ("key") DO NOTHING;
