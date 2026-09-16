-- Professional aptitude quiz (generic question bank, not tied to any real
-- certifying body) + CRM broadcasts (simple V1, sent via existing SMTP
-- helper — no queue). Both additive only, no ALTER/DROP on existing tables.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0014_quiz_broadcast_system.sql

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

CREATE TABLE "quiz_attempt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "score" integer NOT NULL,
  "total_questions" integer NOT NULL,
  "passed" boolean NOT NULL,
  "answers" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "broadcast_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject" text NOT NULL,
  "filter_json" text NOT NULL,
  "sent_count" integer DEFAULT 0,
  "failed_count" integer DEFAULT 0,
  "sent_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
