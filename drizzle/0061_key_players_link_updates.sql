-- Homepage "Key Players" strip: repoint two company cards away from third-party
-- pages to the companies' own sites. The strip is rendered twice on the
-- homepage — TrustedByStrip and PartnersSection — and both read this one
-- setting, so a single row here fixes both.
--
--   CEP — Construction Economists Partnership Limited
--     was https://www.linkedin.com/company/construction-economists-partnership-limited-cep-/
--     now http://cepeconomists.com
--   The Building Practice
--     was https://www.instagram.com/thebuildingpractice
--     now https://www.buildingpractice.biz/
--
-- CEP stays on plain http on purpose: the host serves a certificate issued for
-- autoconfig.cepeconomists.com, so the name does not match and the TLS
-- handshake fails. Revisit once that certificate is fixed.
--
-- No schema change: platform_setting is the keyed jsonb bag (0030). The 0057
-- seed and the KEY_PLAYERS_DEFAULT fallback both carried the old URLs, but a
-- database that already has a `key_players` row reads neither — it renders the
-- stored value — so this rewrites hrefs on the live row in place.
--
-- Idempotent and re-runnable: only the href of a matched card is replaced,
-- every other entry is passed through untouched, and the EXISTS guard means a
-- re-run matches nothing. A super admin's curation is otherwise left alone.
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0061_key_players_link_updates.sql
WITH wanted("name_match", "href") AS (
  VALUES
    ('cep%construction economists%', 'http://cepeconomists.com'),
    ('the building practice',        'https://www.buildingpractice.biz/')
)
UPDATE "platform_setting" AS s
SET "value" = jsonb_set(
  s."value",
  '{logos}',
  (
    SELECT jsonb_agg(
      COALESCE(
        (
          SELECT jsonb_set(logo, '{href}', to_jsonb(w."href"), true)
          FROM wanted w
          WHERE lower(logo ->> 'name') LIKE w."name_match"
            AND COALESCE(logo ->> 'href', '') <> w."href"
        ),
        logo
      )
      ORDER BY ord
    )
    FROM jsonb_array_elements(s."value" -> 'logos') WITH ORDINALITY AS logo(logo, ord)
  ),
  true
),
"updated_at" = now()
WHERE s."key" = 'key_players'
  AND jsonb_typeof(s."value" -> 'logos') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(s."value" -> 'logos') AS l
    JOIN wanted w ON lower(l ->> 'name') LIKE w."name_match"
    WHERE COALESCE(l ->> 'href', '') <> w."href"
  );
