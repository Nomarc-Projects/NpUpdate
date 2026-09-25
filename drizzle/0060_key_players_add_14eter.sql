-- Homepage "Key Players" strip: append 14Eter Limited to the curated company
-- cards (name, mark image, external link).
--
-- No schema change: platform_setting is the keyed jsonb bag (0030). The 0057
-- seed uses ON CONFLICT DO NOTHING, so databases that already have a
-- `key_players` row never picked up the new default entry — this updates the
-- live row in place. Idempotent and re-runnable: appends only when no entry
-- with that name exists, so a super admin's curation is never clobbered and
-- a re-run matches nothing.
-- Apply: DATABASE_URL=... node scripts/apply-migration.cjs drizzle/0060_key_players_add_14eter.sql
UPDATE "platform_setting"
SET "value" = jsonb_set(
  "value",
  '{logos}',
  ("value" -> 'logos') || '{"name": "14Eter Limited", "src": "/logos/partners/14eter.svg", "href": "https://14eter.org"}'::jsonb,
  true
),
"updated_at" = now()
WHERE "key" = 'key_players'
  AND jsonb_typeof("value" -> 'logos') = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements("value" -> 'logos') AS logo
    WHERE lower(logo ->> 'name') = '14eter limited'
  );
