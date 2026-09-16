-- Industry events (Phase 1 MVP): listings curated by admins, RSVPs by members.
CREATE TABLE IF NOT EXISTS "event" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'industry',      -- industry | conference | workshop | webinar | training | site_visit | networking
  format text NOT NULL DEFAULT 'in_person',       -- in_person | online | hybrid
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  image_url text,
  external_url text,
  organizer text,
  published boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_rsvp" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES "event"(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'going',           -- going | interested
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_rsvp_event_user_unique UNIQUE (event_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_starts_at_idx" ON "event" (starts_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_rsvp_user_idx" ON "event_rsvp" (user_id);
