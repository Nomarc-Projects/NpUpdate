ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "sku" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "category" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "type" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "vendor_name" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "retail_min" integer;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "retail_max" integer;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "wholesale_min" integer;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "wholesale_max" integer;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "cost_per_item" integer;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "stock" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "unit" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "seo_title" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "seo_description" text;
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"spec" text,
	"price" integer,
	"stock" integer DEFAULT 0,
	"sku" text,
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
