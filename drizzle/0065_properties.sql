-- Nomarc Projects — property listing & management domain.
--
-- Adds the property marketplace tables used by the /dashboard/properties and
-- /properties surfaces. Money is stored in minor units (kobo/cents); the
-- normalised price_ngn_minor column powers cross-currency search and listing
-- fee calculation. Property documents live in the private bucket and are only
-- readable through an ownership-checked presigned GET.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0064_properties.sql

CREATE TABLE IF NOT EXISTS "property_lister_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL UNIQUE,
  "lister_type" text NOT NULL DEFAULT 'homeowner', -- realtor | homeowner | space_owner
  "display_name" text,
  "company_name" text,
  "cac_number" text,
  "phone" text,
  "email" text,
  "verification_status" text NOT NULL DEFAULT 'unverified', -- unverified | pending | verified | rejected
  "verification_note" text,
  "cac_document_key" text,
  "id_document_key" text,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_lister_status_idx" ON "property_lister_profile" ("verification_status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_user_id" text NOT NULL,
  "lister_profile_id" uuid REFERENCES "property_lister_profile"("id") ON DELETE SET NULL,
  "company_id" uuid REFERENCES "company"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "kind" text NOT NULL, -- sale | lease | rent | bulk_land
  "category" text NOT NULL, -- residential | commercial | coworking | shortlet | land
  "property_type" text,
  "address" text,
  "city" text,
  "state" text,
  "country" text NOT NULL DEFAULT 'Nigeria',
  "size_sqm" integer,
  "size_acres" double precision,
  "bedrooms" integer,
  "bathrooms" integer,
  "price_minor" bigint NOT NULL,
  "price_ngn_minor" bigint NOT NULL,
  "currency" text NOT NULL DEFAULT 'NGN',
  "price_period" text NOT NULL DEFAULT 'one_off', -- one_off | annual | monthly | weekly | daily
  "status" text NOT NULL DEFAULT 'draft', -- draft | pending_approval | changes_requested | approved_awaiting_payment | published | rejected | sold | leased | rented | expired | archived
  "is_bulk_land" boolean NOT NULL DEFAULT false,
  "minimum_acreage" double precision DEFAULT 1,
  "document_status" text NOT NULL DEFAULT 'missing', -- missing | pending | verified
  "contact_name" text,
  "contact_phone" text,
  "contact_email" text,
  "flat_fee_minor" bigint,
  "rate_bps" integer,
  "fee_amount_minor" bigint,
  "fee_currency" text NOT NULL DEFAULT 'NGN',
  "fee_status" text NOT NULL DEFAULT 'unpaid', -- unpaid | paid | waived | refunded
  "approved_by" text,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "published_at" timestamptz,
  "expires_at" timestamptz,
  "view_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "property_slug_unique" ON "property" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_owner_idx" ON "property" ("owner_user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_status_published_idx" ON "property" ("status", "published_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_kind_idx" ON "property" ("kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_category_idx" ON "property" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_location_idx" ON "property" ("state", "city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_price_ngn_idx" ON "property" ("price_ngn_minor");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "property"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'image', -- image | aerial | floor_plan | site_plan | video
  "caption" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_media_property_idx" ON "property_media" ("property_id", "sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "property"("id") ON DELETE CASCADE,
  "owner_user_id" text NOT NULL,
  "doc_type" text NOT NULL, -- title_deed | c_of_o | land_use_report | survey_plan | cac_certificate | other
  "storage_key" text NOT NULL,
  "file_name" text,
  "mime_type" text,
  "size_bytes" bigint,
  "status" text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  "reviewed_by" text,
  "reviewed_at" timestamptz,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_document_property_idx" ON "property_document" ("property_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_document_status_idx" ON "property_document" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_fee_payment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "property"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL DEFAULT 'NGN',
  "flat_fee_minor" bigint,
  "rate_bps" integer,
  "value_ngn_minor" bigint,
  "provider" text NOT NULL,
  "reference" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending', -- pending | success | failed | waived
  "paid_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_fee_property_idx" ON "property_fee_payment" ("property_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_fee_user_idx" ON "property_fee_payment" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_inquiry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid NOT NULL REFERENCES "property"("id") ON DELETE CASCADE,
  "buyer_user_id" text NOT NULL,
  "lister_user_id" text NOT NULL,
  "conversation_id" uuid REFERENCES "conversation"("id") ON DELETE SET NULL,
  "message" text,
  "status" text NOT NULL DEFAULT 'open', -- open | closed
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_inquiry_property_idx" ON "property_inquiry" ("property_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_inquiry_buyer_idx" ON "property_inquiry" ("buyer_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_inquiry_lister_idx" ON "property_inquiry" ("lister_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_transaction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid REFERENCES "property"("id") ON DELETE SET NULL,
  "buyer_user_id" text NOT NULL,
  "seller_user_id" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'purchase', -- purchase | investment
  "amount_minor" bigint NOT NULL,
  "currency" text NOT NULL DEFAULT 'NGN',
  "status" text NOT NULL DEFAULT 'pending', -- pending | paid | completed | cancelled
  "payment_reference" text,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_transaction_buyer_idx" ON "property_transaction" ("buyer_user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_transaction_property_idx" ON "property_transaction" ("property_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_certificate" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "transaction_id" uuid NOT NULL REFERENCES "property_transaction"("id") ON DELETE CASCADE,
  "property_id" uuid REFERENCES "property"("id") ON DELETE SET NULL,
  "buyer_user_id" text NOT NULL,
  "certificate_no" text NOT NULL UNIQUE,
  "storage_key" text,
  "issued_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "property_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "property_id" uuid REFERENCES "property"("id") ON DELETE CASCADE,
  "user_id" text,
  "event_type" text NOT NULL, -- view | search | save | inquiry | document_download
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_event_property_idx" ON "property_event" ("property_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "property_event_type_idx" ON "property_event" ("event_type", "created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sowr_enrollment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "property_id" uuid REFERENCES "property"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'active', -- active | pending | withdrawn
  "joined_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sowr_enrollment_user_idx" ON "sowr_enrollment" ("user_id", "created_at" DESC);
--> statement-breakpoint
INSERT INTO "platform_setting" ("key", "value") VALUES (
  'properties',
  '{"enabled": true, "approvalRequired": true, "listingDurationDays": 90, "flatListingFeeMinor": 2500000, "fxRates": {"USD": 1600, "GBP": 2000}, "sowr": {"enabled": true, "heading": "SOWR Real Estate Program", "body": "Partnered with Nomarc Projects, SOWR gives property buyers and investors a structured route into real estate. Join after your property purchase or explore the program from any listing.", "ctaLabel": "Explore SOWR", "ctaHref": "/properties/sowr", "imageUrl": ""}}'::jsonb
) ON CONFLICT ("key") DO NOTHING;
