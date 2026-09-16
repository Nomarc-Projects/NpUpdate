/**
 * Shared read-only connection to the legacy Nomarc SQL Server.
 *
 * Every legacy script goes through here so the connection settings — and the
 * read-only intent — are stated once. Nothing in this file or its callers
 * issues INSERT/UPDATE/DELETE/DDL: the old platform stays untouched, and it
 * remains the source of truth until the import has been verified.
 */
import fs from "node:fs";
import path from "node:path";
import sql from "mssql";

/**
 * Minimal .env reader. The repo has no dotenv dependency — other scripts expect
 * `doppler run` to inject the environment — but these are useful to run
 * standalone. Anything already in the environment wins, so `doppler run` still
 * takes priority.
 */
function loadDotEnv() {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key]) continue;
      process.env[key] = rawVal.trim().replace(/^["'](.*)["']$/, "$1");
    }
  } catch {
    // No .env — rely on the injected environment.
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Run under \`doppler run -p nomarc -c prd --\` or set it in frontend/.env`);
    process.exit(1);
  }
  return v;
}

let pool: sql.ConnectionPool | null = null;

/** Lazily opened shared pool. Safe to call repeatedly. */
export async function legacyPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;
  loadDotEnv();

  const config: sql.config = {
    server: requireEnv("LEGACY_MSSQL_SERVER"),
    database: requireEnv("LEGACY_MSSQL_DATABASE"),
    user: requireEnv("LEGACY_MSSQL_USER"),
    password: requireEnv("LEGACY_MSSQL_PASSWORD"),
    options: {
      encrypt: true,
      // The site4now shared host presents a certificate that doesn't match the
      // instance hostname; without this the TLS handshake fails outright.
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 30_000,
    requestTimeout: 120_000,
    pool: { max: 2, min: 0, idleTimeoutMillis: 30_000 },
  };

  pool = await new sql.ConnectionPool(config).connect();
  return pool;
}

/** Close the shared pool so a script's process can exit. */
export async function closeLegacy(): Promise<void> {
  if (pool) {
    await pool.close().catch(() => {});
    pool = null;
  }
}
