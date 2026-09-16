CREATE TABLE IF NOT EXISTS "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_user_id" text NOT NULL,
	"vendor_company_id" uuid REFERENCES "company"("id") ON DELETE SET NULL,
	"vendor_user_id" text,
	"customer_name" text,
	"customer_company" text,
	"status" text DEFAULT 'pending',
	"payment" text DEFAULT 'pending',
	"subtotal" integer DEFAULT 0,
	"shipping" integer DEFAULT 0,
	"vat" integer DEFAULT 0,
	"commission" integer DEFAULT 0,
	"vendor_net" integer DEFAULT 0,
	"total" integer DEFAULT 0,
	"delivery_method" text,
	"address" text,
	"phone" text,
	"payment_ref" text,
	"provider" text,
	"escrow_state" text DEFAULT 'held',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL REFERENCES "sales_order"("id") ON DELETE CASCADE,
	"product_id" uuid,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_payment_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL UNIQUE REFERENCES "company"("id") ON DELETE CASCADE,
	"paystack_subaccount_code" text,
	"bank_code" text,
	"bank_name" text,
	"account_number" text,
	"account_name" text,
	"dva_account_number" text,
	"dva_bank" text,
	"commission_pct" integer DEFAULT 10,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid REFERENCES "sales_order"("id") ON DELETE SET NULL,
	"vendor_company_id" uuid NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'held',
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL UNIQUE REFERENCES "company"("id") ON DELETE CASCADE,
	"balance_available" integer DEFAULT 0,
	"balance_held" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
