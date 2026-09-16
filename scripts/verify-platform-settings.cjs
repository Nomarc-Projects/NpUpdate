// Confirm the platform_setting table exists and holds a readable maintenance row.
// READ-ONLY: SELECT statements only, nothing is written.
//
// Worth having as its own script because 0030 may be applied while the Doppler
// API is unreachable, in which case the CLI silently falls back to a cached
// secrets file — and you want to know the table landed in the database the app
// actually connects to, not just that a migration reported OK.
//
// Usage: doppler run -p nomarc -c prd -- node scripts/verify-platform-settings.cjs
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
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set (run via `doppler run`)");
    process.exit(1);
  }

  // Show which host/database we're actually pointed at, without the credentials —
  // the whole point when the secret source is uncertain.
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(`Connected target: ${u.host}${u.pathname}`);
  } catch {
    console.log("Connected target: (unparseable DATABASE_URL)");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: resolveSSL(), max: 1 });
  try {
    const exists = await pool.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name = 'platform_setting'`,
    );
    if (!exists.rows[0].n) {
      console.error("\n  MISSING: platform_setting does not exist in this database.");
      console.error("  The migration reported OK against a different target — re-run it once");
      console.error("  `doppler me` succeeds, so secrets come from the live prd config.");
      process.exit(1);
    }
    console.log("  platform_setting: EXISTS");

    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'platform_setting' ORDER BY ordinal_position`,
    );
    console.log("  columns: " + cols.rows.map((c) => `${c.column_name} ${c.data_type}`).join(", "));

    const row = await pool.query(`SELECT key, value, updated_at, updated_by FROM platform_setting ORDER BY key`);
    console.log(`  rows: ${row.rowCount}`);
    for (const r of row.rows) {
      const v = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
      console.log(`    ${r.key}: enabled=${v.enabled}  updated_at=${r.updated_at.toISOString()}  updated_by=${r.updated_by ?? "(seed)"}`);
    }

    const maintenance = row.rows.find((r) => r.key === "maintenance");
    console.log(
      maintenance
        ? "\n  OK — the admin toggle at /admin/maintenance will read and write this row."
        : "\n  WARNING: table exists but the 'maintenance' row is absent; re-run 0030 to seed it.",
    );
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
