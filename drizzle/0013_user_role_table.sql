-- Multi-role model, phase 1: a user can hold multiple roles (professional,
-- exhibitor) simultaneously, unlocked progressively via intent + onboarding
-- rather than chosen once at signup. This table is additive only (no ALTER/
-- DROP on existing tables) and safe to apply ahead of the code that consumes
-- it. `user.role` stays as a synced "primary role" cache during rollout.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0013_user_role_table.sql

CREATE TABLE "user_role" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "source" text NOT NULL,
  "plan" text DEFAULT 'free' NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "granted_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_role_user_id_role_unique" UNIQUE ("user_id", "role")
);

-- Backfill: every existing professional/exhibitor keeps exactly the access
-- they have today, landing pre-granted with no retroactive KYC. Admins get
-- no row here — admin stays on user.role only, never stackable.
INSERT INTO "user_role" (user_id, role, status, source, plan, granted_at)
SELECT id, role, 'active', 'signup_legacy', COALESCE(plan, 'free'), "createdAt"
FROM "user"
WHERE role IN ('professional', 'exhibitor');
