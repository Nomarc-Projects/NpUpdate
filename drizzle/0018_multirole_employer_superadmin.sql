-- Multi-role expansion — foundation for the dashboard overhaul.
-- Adds the `employer` stackable role and the `super_admin` scalar role, plus a
-- persisted `active_role` on the user that drives the role switcher.
--
-- `user_role.role` and `user.role` are free-text columns, so `employer` and
-- `super_admin` need NO enum change — the app-level TS types widen instead.
-- `active_role` is read/written with raw SQL (not a Better Auth additionalField),
-- so Better Auth simply ignores the extra column.
--
-- Additive only — no ALTER/DROP on existing data.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0018_multirole_employer_superadmin.sql

-- Which held role the dashboard currently shows. NULL = fall back to the synced
-- primary-role precedence (exhibitor > professional > employer > client). Set on
-- role grant (defaults to the freshly granted role) and by the role switcher.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "active_role" text;
