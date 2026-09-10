-- Directory catalogue: admin-curated institutions and government ministries
-- shown on the tabbed Directory (People · Companies · Institutions · Gov't Ministries).
CREATE TABLE IF NOT EXISTS "catalogue_entry" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,               -- institution | ministry
  name text NOT NULL,
  acronym text,
  category text,
  location text,
  email text,
  phone text,
  website text,
  about text,
  logo_url text,
  published boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "catalogue_entry_kind_idx" ON "catalogue_entry" (kind);