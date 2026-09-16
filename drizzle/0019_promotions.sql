-- Ads Board (self-serve promotions) — distinct from the admin-curated `advert`
-- table (public-site marketing content). A professional or exhibitor creates a
-- promotion of their OWN profile, project, or product, submits it for admin
-- review, and tracks its lifecycle + metrics from their dashboard.
-- Additive only — no ALTER/DROP on existing tables.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0019_promotions.sql

CREATE TABLE IF NOT EXISTS "promotion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" text NOT NULL,
  "kind" text NOT NULL,
  "ref_id" uuid,
  "headline" text NOT NULL,
  "description" text,
  "banner_image_url" text,
  "status" text DEFAULT 'pending_review' NOT NULL,
  "rejection_reason" text,
  "views" integer DEFAULT 0 NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "promotion_owner_idx" ON "promotion" ("owner_user_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotion_status_idx" ON "promotion" ("status", "created_at" DESC);
