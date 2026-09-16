/**
 * One-off: create the company_certification table on CockroachDB.
 * Run: doppler run -p nomarc -c dev -- npx tsx scripts/migrate-company-cert.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_certification (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      issuer TEXT,
      year INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS company_certification_company_id_idx ON company_certification(company_id);`);
  console.log("company_certification ready");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
