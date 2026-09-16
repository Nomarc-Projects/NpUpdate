CREATE TABLE IF NOT EXISTS "professional_registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"registration_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_type" text DEFAULT 'email',
	"contact" text,
	"organization" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
