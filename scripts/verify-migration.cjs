// Read-only migration audit: how much of the legacy import actually landed.
// SELECT statements only.
//
// Usage: doppler run -p nomarc -c prd -- node scripts/verify-migration.cjs
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
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set (run via `doppler run`)"); process.exit(1); }
  try { const u = new URL(process.env.DATABASE_URL); console.log(`target: ${u.host}${u.pathname}\n`); } catch {}

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: resolveSSL(), max: 1 });
  const q = async (label, sql) => {
    try {
      const r = await pool.query(sql);
      console.log(`── ${label}`);
      if (!r.rows.length) return console.log("   (none)\n");
      for (const row of r.rows) console.log("   " + Object.entries(row).map(([k, v]) => `${k}=${v}`).join("  "));
      console.log("");
    } catch (e) { console.log(`── ${label}\n   ERROR: ${e.message}\n`); }
  };

  await q("Total users", `SELECT count(*)::int AS users FROM "user"`);
  await q("By user.role", `SELECT COALESCE(role,'(null)') AS role, count(*)::int AS n FROM "user" GROUP BY role ORDER BY n DESC`);
  await q("user_role (source of truth)", `SELECT role, source, count(*)::int AS n FROM user_role WHERE status='active' GROUP BY role, source ORDER BY n DESC`);
  await q("Imported from legacy", `SELECT count(DISTINCT user_id)::int AS legacy_users FROM user_role WHERE source='signup_legacy'`);
  await q("Profiles created", `SELECT count(*)::int AS profiles FROM profile`);
  await q("Signup dates preserved (oldest 5)", `SELECT email, "createdAt"::date AS joined FROM "user" ORDER BY "createdAt" ASC LIMIT 5`);
  await q("Newest 5 accounts", `SELECT email, "createdAt"::date AS joined FROM "user" ORDER BY "createdAt" DESC LIMIT 5`);
  await q("Maintenance flag", `SELECT key, value->>'enabled' AS enabled, updated_at FROM platform_setting WHERE key='maintenance'`);

  await pool.end();
})();
