CREATE TABLE "audience_segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"rules_json" text NOT NULL,
	"match_mode" text DEFAULT 'all' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"filter_json" text NOT NULL,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"sent_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"address" text NOT NULL,
	"city" text,
	"state" text,
	"country" text,
	"phone" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"acronym" text,
	"category" text,
	"location" text,
	"email" text,
	"phone" text,
	"website" text,
	"about" text,
	"logo_url" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_company_id" uuid NOT NULL,
	"buyer_user_id" text NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"segment_id" uuid,
	"audience_key" text DEFAULT 'all_users' NOT NULL,
	"manual_emails" text[],
	"subject" text NOT NULL,
	"preview_text" text,
	"from_name" text,
	"reply_to" text,
	"body_html" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_by" text,
	"submitted_at" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaign_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" text,
	"kind" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid,
	"employer_type" text,
	"hiring_as" text,
	"contact_person" text,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"name" text,
	"headquarters" text,
	"company_size" text,
	"year_founded" integer,
	"about" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'industry' NOT NULL,
	"format" text DEFAULT 'in_person' NOT NULL,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"image_url" text,
	"external_url" text,
	"organizer" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'going' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helm_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"discipline" text,
	"project_id" uuid,
	"archived" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helm_document" (
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
);
--> statement-breakpoint
CREATE TABLE "helm_message" (
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
);
--> statement-breakpoint
CREATE TABLE "helm_proposal" (
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
);
--> statement-breakpoint
CREATE TABLE "helm_quota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" text,
	"user_id" text,
	"monthly_messages" integer,
	"priority" integer DEFAULT 0,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"period" text NOT NULL,
	"message_count" integer DEFAULT 0,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"total_latency_ms" integer DEFAULT 0,
	"cache_hits" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"order_id" uuid,
	"type" text DEFAULT 'order',
	"issuer_company_id" uuid,
	"issuer_name" text,
	"issuer_address" text,
	"issuer_email" text,
	"recipient_user_id" text,
	"recipient_name" text,
	"recipient_company" text,
	"recipient_address" text,
	"recipient_email" text,
	"subtotal" integer DEFAULT 0,
	"vat" integer DEFAULT 0,
	"vat_rate" integer DEFAULT 750,
	"shipping" integer DEFAULT 0,
	"discount" integer DEFAULT 0,
	"total" integer DEFAULT 0,
	"currency" text DEFAULT 'NGN',
	"status" text DEFAULT 'issued',
	"issued_at" timestamp with time zone DEFAULT now(),
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "kyc_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"tier" integer NOT NULL,
	"doc_type" text NOT NULL,
	"file_url" text,
	"text_value" text,
	"status" text DEFAULT 'pending',
	"admin_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text
);
--> statement-breakpoint
CREATE TABLE "ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"vendor_company_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'held',
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"prefs" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"image" text
);
--> statement-breakpoint
CREATE TABLE "payment_retry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_error" text,
	"next_retry_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bank_code" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"paystack_recipient" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_account_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "phone_otp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "product_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"spec" text,
	"price" integer,
	"stock" integer DEFAULT 0,
	"sku" text,
	"active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion" (
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
	"duration_days" integer,
	"amount" integer,
	"payment_reference" text,
	"paid_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"passed" boolean NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"image_url" text,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"option_d" text NOT NULL,
	"correct_option" text NOT NULL,
	"explanation" text,
	"exam_tag" text,
	"subject_tag" text,
	"year" integer,
	"time_limit_seconds" integer,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_proposal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"exhibitor_user_id" text NOT NULL,
	"quantity_quoted" text,
	"total_price" bigint,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"valid_until" date,
	"note" text,
	"attachments" text[],
	"status" text DEFAULT 'sent' NOT NULL,
	"buyer_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_user_id" text NOT NULL,
	"vendor_company_id" uuid,
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
CREATE TABLE "saved_search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"query" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"reporter_email" text,
	"category" text DEFAULT 'other',
	"subject" text NOT NULL,
	"description" text,
	"order_id" uuid,
	"status" text DEFAULT 'open',
	"priority" text DEFAULT 'medium',
	"assigned_to" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"sender_role" text DEFAULT 'user',
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"current_period_end" timestamp with time zone,
	"pending_plan" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_payment_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
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
CREATE TABLE "vendor_wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"balance_available" integer DEFAULT 0,
	"balance_held" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_wallet_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text,
	"reference" text,
	"raw_body" text NOT NULL,
	"status" text DEFAULT 'processed',
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN "promoted_name" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN "promoted_meta" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN "cta_label_2" text;--> statement-breakpoint
ALTER TABLE "advert" ADD COLUMN "cta_href_2" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "contact_person" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "company_type" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "registration_number" text;--> statement-breakpoint
ALTER TABLE "company" ADD COLUMN "trial_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_participant" ADD COLUMN "muted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "proof_url" text;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "proof_status" text;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "proof_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "certificates" jsonb;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "currency" text DEFAULT 'NGN';--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "requirement_list" text[];--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "benefits" text[];--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "require_resume" boolean;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "require_portfolio" boolean;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "require_cover_letter" boolean;--> statement-breakpoint
ALTER TABLE "list" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "message_type" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "kind" text DEFAULT 'billing';--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "payload" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "vendor_name" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "specs" jsonb;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "retail_min" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "retail_max" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "wholesale_min" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "wholesale_max" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "cost_per_item" integer;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "stock" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "practice_licence_status" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "practice_status" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "license_number" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "registration_number" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "practice_company_name" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "practice_reg_number" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "practice_company_address" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "practice_company_bio" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "company_kind" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "discipline" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "ongoing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "responsibilities" text[];--> statement-breakpoint
ALTER TABLE "quote_request" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote_request" ADD COLUMN "buyer_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote_request" ADD COLUMN "exhibitor_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_experience" ADD COLUMN "work_photo" text;--> statement-breakpoint
ALTER TABLE "work_experience" ADD COLUMN "work_photos" jsonb;--> statement-breakpoint
ALTER TABLE "customer_note" ADD CONSTRAINT "customer_note_vendor_company_id_company_id_fk" FOREIGN KEY ("vendor_company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_profile" ADD CONSTRAINT "employer_profile_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_issuer_company_id_company_id_fk" FOREIGN KEY ("issuer_company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_vendor_company_id_company_id_fk" FOREIGN KEY ("vendor_company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_product_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_proposal" ADD CONSTRAINT "quote_proposal_quote_request_id_quote_request_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_vendor_company_id_company_id_fk" FOREIGN KEY ("vendor_company_id") REFERENCES "public"."company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_order_id_sales_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticket_id_support_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payment_account" ADD CONSTRAINT "vendor_payment_account_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_wallet" ADD CONSTRAINT "vendor_wallet_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_rsvp_event_user_unique" ON "event_rsvp" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "helm_usage_user_period_idx" ON "helm_usage" USING btree ("user_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "phone_otp_user_id_role_idx" ON "phone_otp" USING btree ("user_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_user_id_role_idx" ON "user_role" USING btree ("user_id","role");