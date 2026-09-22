-- Homepage "Key Players" strip: super-admin-editable content for the "Key
-- Players and Fastest Growing Companies in the Industry" marquee on the
-- homepage (heading + company cards: name, mark image, external link), plus an
-- enabled flag to show/hide the whole strip.
--
-- No schema change: platform_setting is the keyed jsonb bag (0030). Seed the
-- current designed copy so the homepage renders identically until a super
-- admin edits it. ON CONFLICT keeps a re-run from clobbering a live edit.
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0057_key_players_setting.sql
INSERT INTO "platform_setting" ("key", "value") VALUES (
  'key_players',
  '{"enabled": true, "heading": "Key Players and Fastest Growing Companies in the Industry", "logos": [
    {"name": "MC&T \u2014 Migliore Construzione & Tecniche", "src": "/logos/partners/mct.png", "href": "https://mcandt.com.ng/"},
    {"name": "The Building Practice", "src": "/logos/partners/building-practice.png", "href": "https://www.instagram.com/thebuildingpractice"},
    {"name": "CEP \u2014 Construction Economists Partnership Limited", "src": "/logos/partners/cep.png", "href": "https://www.linkedin.com/company/construction-economists-partnership-limited-cep-/"},
    {"name": "DanBran Projects Limited", "src": "/logos/partners/danbran-projects.png", "href": "https://danbranprojectsltd.com/danbran12dx/"},
    {"name": "Nomadic Architects", "src": "/logos/partners/nomadic-architects.png", "href": "https://nomarcprojects.com"},
    {"name": "Tivisto", "src": "/logos/partners/tivisto.png", "href": "https://drive.google.com/file/d/19crZRwag_msXnClaN8VGW8q71iMOjKy1/view"}
  ]}'::jsonb
) ON CONFLICT ("key") DO NOTHING;