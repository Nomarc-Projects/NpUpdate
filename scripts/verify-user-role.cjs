// Read-only sanity check for the 0013_user_role_table.sql backfill.
// Usage: doppler run --project nomarc --config prd -- node scripts/verify-user-role.cjs
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
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: resolveSSL(), max: 1 });
  try {
    const userCounts = await pool.query(`SELECT role, count(*) FROM "user" GROUP BY role ORDER BY role`);
    const roleCounts = await pool.query(`SELECT role, status, source, count(*) FROM user_role GROUP BY role, status, source ORDER BY role, status, source`);
    const mismatches = await pool.query(`
      SELECT u.id, u.role FROM "user" u
      LEFT JOIN user_role ur ON ur.user_id = u.id AND ur.role = u.role AND ur.status = 'active'
      WHERE u.role IN ('professional', 'exhibitor') AND ur.id IS NULL
    `);

    console.log("-- user.role counts --");
    console.table(userCounts.rows);
    console.log("-- user_role counts (by role/status/source) --");
    console.table(roleCounts.rows);
    console.log(`-- users missing an active user_role row for their legacy role: ${mismatches.rows.length} --`);
    if (mismatches.rows.length) console.table(mismatches.rows.slice(0, 20));
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
