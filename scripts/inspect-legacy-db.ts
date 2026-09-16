/**
 * Inspect the legacy Nomarc SQL Server schema. READ-ONLY.
 *
 * The old import pipeline's CSVs and its puller script are both gone (they lived
 * under the gitignored plans/ directory), so the legacy column names have to be
 * re-derived before anything can be extracted. This prints the tables, their
 * columns and their row counts so the mapping is based on what is actually there
 * rather than on a guess.
 *
 * Issues SELECT statements only — against INFORMATION_SCHEMA plus COUNT(*) and a
 * handful of TOP 3 samples. It opens the connection with an explicit
 * read-committed intent and never emits INSERT/UPDATE/DELETE/DDL. Nothing in the
 * legacy database is modified.
 *
 * Run: cd frontend && doppler run -p nomarc -c prd -- npx tsx scripts/inspect-legacy-db.ts
 *      (or with LEGACY_MSSQL_* already in .env: npx tsx scripts/inspect-legacy-db.ts)
 */
import fs from "node:fs";
import path from "node:path";
import sql from "mssql";

/** Tables whose names suggest they hold people. Everything else is summarised. */
const USERISH = /user|member|account|profile|subscrib|waitlist|contact|register|aspnet/i;

/** Columns we never print samples for, even in a truncated form. */
const SECRET = /password|passwordhash|securitystamp|token|secret|salt/i;

/**
 * Minimal .env reader. The repo has no dotenv dependency — every other script
 * expects `doppler run` to inject the environment — but this one is useful to
 * run standalone, so fall back to the local file when a var is absent. Values
 * already in the environment always win, so `doppler run` still takes priority.
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
loadDotEnv();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Run under \`doppler run -p nomarc -c prd --\` or set it in .env`);
    process.exit(1);
  }
  return v;
}

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

interface ColumnRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  IS_NULLABLE: string;
}

async function main() {
  console.log("═".repeat(70));
  console.log("  LEGACY DB INSPECTION — READ ONLY");
  console.log(`  ${config.server} / ${config.database}`);
  console.log("═".repeat(70));

  const pool = await new sql.ConnectionPool(config).connect();
  try {
    // ── Tables ──────────────────────────────────────────────────────────
    const tables = (
      await pool.request().query<{ TABLE_NAME: string; TABLE_SCHEMA: string }>(`
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `)
    ).recordset;

    console.log(`\n${tables.length} base tables\n`);

    // ── Row counts (one query, cheap) ───────────────────────────────────
    const counts = new Map<string, number>();
    try {
      const rows = (
        await pool.request().query<{ name: string; rows: number }>(`
          SELECT t.name AS name, SUM(p.rows) AS rows
          FROM sys.tables t
          JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0, 1)
          GROUP BY t.name
        `)
      ).recordset;
      for (const r of rows) counts.set(r.name, Number(r.rows));
    } catch {
      // sys.* may be restricted on shared hosting — fall back to per-table COUNT.
      for (const t of tables) {
        try {
          const c = (
            await pool.request().query<{ n: number }>(`SELECT COUNT(*) AS n FROM [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`)
          ).recordset[0]?.n;
          counts.set(t.TABLE_NAME, Number(c ?? 0));
        } catch {
          counts.set(t.TABLE_NAME, -1);
        }
      }
    }

    // ── All columns in one shot ─────────────────────────────────────────
    const allCols = (
      await pool.request().query<ColumnRow>(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `)
    ).recordset;
    const colsByTable = new Map<string, ColumnRow[]>();
    for (const c of allCols) {
      const list = colsByTable.get(c.TABLE_NAME) ?? [];
      list.push(c);
      colsByTable.set(c.TABLE_NAME, list);
    }

    // ── Summary table, biggest first ────────────────────────────────────
    console.log("ROW COUNTS".padEnd(46) + "ROWS   USER-ISH?");
    console.log("-".repeat(70));
    const sorted = [...tables].sort((a, b) => (counts.get(b.TABLE_NAME) ?? 0) - (counts.get(a.TABLE_NAME) ?? 0));
    for (const t of sorted) {
      const n = counts.get(t.TABLE_NAME) ?? 0;
      const flag = USERISH.test(t.TABLE_NAME) ? "  ← people" : "";
      console.log(`${t.TABLE_NAME.slice(0, 44).padEnd(46)}${String(n).padStart(6)}${flag}`);
    }

    // ── Full detail for the people-shaped tables ────────────────────────
    const people = sorted.filter((t) => USERISH.test(t.TABLE_NAME) && (counts.get(t.TABLE_NAME) ?? 0) > 0);
    for (const t of people) {
      console.log(`\n${"═".repeat(70)}`);
      console.log(`  ${t.TABLE_SCHEMA}.${t.TABLE_NAME}  —  ${counts.get(t.TABLE_NAME)} rows`);
      console.log("═".repeat(70));
      for (const c of colsByTable.get(t.TABLE_NAME) ?? []) {
        const len = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : "";
        const nul = c.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
        console.log(`  ${c.COLUMN_NAME.padEnd(34)} ${(c.DATA_TYPE + len).padEnd(18)} ${nul}`);
      }

      // Three sample rows, with anything credential-shaped redacted and long
      // values clipped — enough to understand the data's shape, nothing more.
      try {
        const safeCols = (colsByTable.get(t.TABLE_NAME) ?? [])
          .filter((c) => !SECRET.test(c.COLUMN_NAME))
          .map((c) => `[${c.COLUMN_NAME}]`);
        if (safeCols.length) {
          const sample = (
            await pool.request().query(`SELECT TOP 3 ${safeCols.join(", ")} FROM [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`)
          ).recordset;
          console.log("\n  Sample rows:");
          sample.forEach((row: Record<string, unknown>, i: number) => {
            const compact = Object.entries(row)
              .filter(([, v]) => v !== null && v !== "")
              .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
              .join("  ");
            console.log(`    [${i + 1}] ${compact}`);
          });
        }
      } catch (e) {
        console.log(`  (sample failed: ${e instanceof Error ? e.message : String(e)})`);
      }
    }

    console.log(`\n${"═".repeat(70)}`);
    console.log("  Done. Nothing was written to the legacy database.");
    console.log("═".repeat(70));
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
