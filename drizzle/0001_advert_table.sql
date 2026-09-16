CREATE TABLE IF NOT EXISTS "advert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"heading" text NOT NULL,
	"subheading" text,
	"body" text,
	"badge" text,
	"cta_label" text,
	"cta_href" text,
	"image_url" text,
	"accent" text DEFAULT '#ffd716',
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
