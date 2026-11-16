/**
 * Restore a Nomarc backup produced by the /backup console (lib/db/backup.ts).
 *
 *   npm run db:restore -- nomarc-backup-….sql
 *
 * Safety rails, because this file rewrites a database:
 *   - Refuses any non-loopback DATABASE_URL unless ALLOW_REMOTE_RESTORE=1, so a
 *     stray production env var can never be clobbered by a local experiment.
 *   - Refuses to run against a database that already has tables unless --force
 *     (the dump is duplicate-tolerant but not row-deduplicating: restoring over
 *     existing rows would double them).
 *   - Sends the whole file as one pg simple-query call, so it executes in a
 *     single implicit transaction and an error anywhere rolls everything back.
 *
 * For huge dumps prefer psql directly: psql "$DATABASE_URL" -f backup.sql
 */
const fs = require("node:fs");
const path = require("node:path");
const { loadEnvLocal } = require("./lib/env.cjs");

loadEnvLocal();

const file = process.argv[2];
const force = process.argv.includes("--force");
const allowRemote = process.env.ALLOW_REMOTE_RESTORE === "1";

if (!file) {
  console.error("Usage: npm run db:restore -- <backup.sql> [--force]");
  process.exit(1);
}
const sqlPath = path.resolve(process.cwd(), file);
if (!fs.existsSync(sqlPath)) {
  console.error(`No such file: ${sqlPath}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (checked env, .env.local, .env).");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}
const host = parsed.hostname;
const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
if (!loopback && !allowRemote) {
  console.error(
    `\nRefusing to restore into a non-loopback database (${host}).\n` +
      "A restore over production would duplicate or destroy live data.\n" +
      "Set ALLOW_REMOTE_RESTORE=1 if you really mean it (e.g. migrating servers\n" +
      "into a FRESH, EMPTY database).\n",
  );
  process.exit(1);
}

const Pool = require(path.join(process.cwd(), "node_modules", "pg")).Pool;

const ssl = (() => {
  if (loopback) return undefined;
  const envCert = process.env.COCKROACH_CA_CERT || process.env.COCKROACH_CERT;
  if (envCert && envCert.includes("BEGIN CERTIFICATE")) return { ca: envCert, rejectUnauthorized: true };
  return { rejectUnauthorized: true };
})();

async function main() {
  const pool = new Pool({ connectionString: url, ssl, max: 1 });
  const client = await pool.connect();
  try {
    if (!force) {
      const existing = await client.query(
        `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
      );
      if (existing.rows[0].n > 0) {
        console.error(
          `\nThis database already has ${existing.rows[0].n} table(s) in schema public.\n` +
            "Restoring a full dump over existing tables would duplicate rows.\n" +
            "Use a fresh database, or pass --force to continue anyway.\n",
        );
        process.exit(1);
      }
    }

    const bytes = fs.statSync(sqlPath).size;
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log(
      `Restoring ${path.basename(sqlPath)} (${(bytes / 1024 / 1024).toFixed(1)} MB) into ${parsed.hostname}:${parsed.port}${parsed.pathname} …`,
    );
    const started = Date.now();
    // String-without-values query ⇒ pg simple protocol ⇒ the entire file runs
    // as one implicit transaction: any error rolls back everything.
    await client.query(sql);
    console.log(`✓ Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("\n✗ Restore failed:", err.message);
  // The single-transaction guarantee means the target is untouched on failure.
  console.error("  The database was left unchanged (the file runs as one transaction).");
  process.exit(1);
});
