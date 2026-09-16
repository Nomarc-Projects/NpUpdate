/**
 * One-off: create the crm_lead table on CockroachDB.
 * Run: doppler run -p nomarc -c dev -- npx tsx scripts/migrate-crm.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS crm_lead (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      source TEXT NOT NULL DEFAULT 'contact_form',
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_lead_status_idx ON crm_lead(status);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS crm_lead_created_at_idx ON crm_lead(created_at DESC);`);
  console.log("crm_lead table ready");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
