// Apply a single drizzle SQL migration file to CockroachDB.
// Usage: doppler run --project nomarc --config prd -- node scripts/apply-migration.cjs drizzle/0002_profile_extras.sql
// DATABASE_URL is injected by `doppler run` and never printed.
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

function resolveSSL() {
  const envCert = process.env.COCKROACH_CA_CERT || process.env.COCKROACH_CERT;
  if (envCert && envCert.includes("BEGIN CERTIFICATE")) return { ca: envCert, rejectUnauthorized: true };
  try {
    return { ca: fs.readFileSync(path.join(process.cwd(), "certs", "cockroach-ca.crt"), "utf8"), rejectUnauthorized: true };
  } catch {
    return { rejectUnauthorized: true };
  }
}

(async () => {
  const file = process.argv[2];
  if (!file) { console.error("Usage: node scripts/apply-migration.cjs <path-to.sql>"); process.exit(1); }
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set (run via `doppler run`)"); process.exit(1); }
  const sql = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: resolveSSL(), max: 1 });
  try {
    // drizzle separates statements with this marker
    const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) await pool.query(stmt);
    console.log(`OK: applied ${statements.length} statement(s) from ${file}`);
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
