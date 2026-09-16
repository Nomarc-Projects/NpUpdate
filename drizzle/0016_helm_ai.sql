-- Helm (AI consultant) — app-side metadata: chat threads, private document
-- registry, confirm-gated write proposals, and the fair-use usage/quota meter.
-- The RAG store itself (embeddings, knowledge chunks, per-user memory) lives in
-- the VM's own Postgres + pgvector and is NOT created here.
-- Additive only — no ALTER/DROP on existing tables.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0016_helm_ai.sql

-- Canonical discipline on the professional's profile. Until now the occupation
-- was only free text (`profile.headline`); Helm needs a stable value to pick a
-- persona and filter retrieval. Null = infer from headline at read time.
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "discipline" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "helm_conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "title" text DEFAULT 'New conversation' NOT NULL,
  "discipline" text,
  "project_id" uuid,
  "archived" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "helm_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "citations" jsonb,
  "tool" text,
  "tool_result" jsonb,
  "grounded" boolean DEFAULT false,
  "rating" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "helm_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "storage_key" text NOT NULL,
  "mime_type" text,
  "size_bytes" integer,
  "namespace" text NOT NULL,
  "index_status" text DEFAULT 'pending' NOT NULL,
  "chunk_count" integer DEFAULT 0,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "helm_proposal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "conversation_id" uuid,
  "message_id" uuid,
  "tool" text NOT NULL,
  "action" text NOT NULL,
  "params" jsonb NOT NULL,
  "summary" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "error" text,
  "applied_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "helm_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "period" text NOT NULL,
  "message_count" integer DEFAULT 0,
  "input_tokens" integer DEFAULT 0,
  "output_tokens" integer DEFAULT 0,
  "total_latency_ms" integer DEFAULT 0,
  "cache_hits" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "helm_quota" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan" text,
  "user_id" text,
  "monthly_messages" integer,
  "priority" integer DEFAULT 0,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Lookup paths used on every request.
CREATE INDEX IF NOT EXISTS "helm_conversation_user_idx" ON "helm_conversation" ("user_id", "updated_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "helm_message_conversation_idx" ON "helm_message" ("conversation_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "helm_document_user_idx" ON "helm_document" ("user_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "helm_proposal_user_idx" ON "helm_proposal" ("user_id", "created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "helm_usage_user_period_idx" ON "helm_usage" ("user_id", "period");--> statement-breakpoint

-- Plan-default allowances (per-user overrides are inserted by admins later).
-- Plus/Pro/Premium reflect the tiered fair-use model; free has no Helm access
-- (the `aiConsultant` capability gates at >= plus), so it is seeded at 0.
INSERT INTO "helm_quota" ("plan", "monthly_messages", "priority", "note")
SELECT 'free', 0, 0, 'No Helm access — upgrade required'
WHERE NOT EXISTS (SELECT 1 FROM "helm_quota" WHERE "plan" = 'free' AND "user_id" IS NULL);--> statement-breakpoint

INSERT INTO "helm_quota" ("plan", "monthly_messages", "priority", "note")
SELECT 'plus', 150, 1, 'Plus — standard allowance'
WHERE NOT EXISTS (SELECT 1 FROM "helm_quota" WHERE "plan" = 'plus' AND "user_id" IS NULL);--> statement-breakpoint

INSERT INTO "helm_quota" ("plan", "monthly_messages", "priority", "note")
SELECT 'pro', 600, 2, 'Pro — generous allowance'
WHERE NOT EXISTS (SELECT 1 FROM "helm_quota" WHERE "plan" = 'pro' AND "user_id" IS NULL);--> statement-breakpoint

INSERT INTO "helm_quota" ("plan", "monthly_messages", "priority", "note")
SELECT 'premium', NULL, 3, 'Premium — unlimited, top priority'
WHERE NOT EXISTS (SELECT 1 FROM "helm_quota" WHERE "plan" = 'premium' AND "user_id" IS NULL);
