-- 'about_team' platform setting: super-admin-editable content for the "The Minds
-- Behind Nomarc" section on the About page (heading, subtitle, eyebrow, and
-- team member cards), plus an enabled flag to show/hide the whole section.
--
-- No schema change: platform_setting is the keyed jsonb bag (0030). Seed the
-- current designed copy so the About page renders identically until a super
-- admin edits it. ON CONFLICT keeps a re-run from clobbering a live edit.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0050_about_team_setting.sql
INSERT INTO "platform_setting" ("key", "value") VALUES (
  'about_team',
  '{"enabled": true, "heading": "The Minds Behind Nomarc", "subtitle": "Our platform is built by people who understand the industry\u0027s challenges firsthand. Meet the individuals working together to turn our vision for a connected infrastructure into reality.", "eyebrow": "Meet the team", "members": [{"name": "Adepero Abraham", "role": "Founder and CEO", "img": "/media/about/team-3.webp"}, {"name": "Abiola Abraham", "role": "Product Quality Engineer", "img": "/media/about/team-4.webp"}, {"name": "Olude Peter", "role": "Communications Manager", "img": "/media/about/team-2.webp"}, {"name": "J. Segun Ajanlekoko", "role": "Managing Partner at CEP Limited", "img": "/media/about/team-1.webp"}]}'::jsonb
) ON CONFLICT ("key") DO NOTHING;