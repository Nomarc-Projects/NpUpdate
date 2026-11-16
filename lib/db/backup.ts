import "server-only";
import { Pool, types as pgTypes } from "pg";
import { Readable } from "node:stream";
import { resolveSSL } from "./client";

/**
 * Self-contained SQL backup of the application database.
 *
 * Produces a single `.sql` file, streamed (constant memory), that can rebuild
 * the database on any PostgreSQL-compatible server — Postgres or CockroachDB —
 * without needing this repo, pg_dump (not installed in the slim runtime image),
 * or any extension:
 *
 *   schema  — CREATE TABLE IF NOT EXISTS … generated from the *actual* shape of
 *             the running database (information_schema + pg_catalog), not from
 *             lib/db/schema.ts, so the file always matches the data it carries.
 *   data    — INSERT statements, read through one REPEATABLE READ READ ONLY
 *             snapshot so every table is captured at the same instant;
 *             single-primary-key tables are keyset-paginated (O(n) on the PK
 *             index), the rest use LIMIT/OFFSET inside that snapshot.
 *   after   — foreign keys (added last so load order never matters, each in a
 *             DO block that tolerates an already-existing constraint),
 *             sequence positions, ANALYZE.
 *
 * Restore on a fresh server:
 *   npm run db:restore -- nomarc-backup-….sql      (or: psql -f …)
 *
 * Secrets (BETTER_AUTH_SECRET, JWT_SECRET, R2 keys, SMTP…) are NOT in the
 * database — they live in Dokploy's env and must be carried over separately.
 */

const CHUNK_ROWS = 2_000;
/** Keyset page size: amortises round-trips while a page stays a few MB. */
const PAGE_ROWS = 2_000;

type Product = "postgresql" | "cockroachdb";

export type BackupMeta = {
  product: Product;
  version: string;
  database: string;
  host: string;
  tables: number;
  /** pg_database_size(current_database()) — null when the product can't say. */
  bytes: number | null;
  /** Sum of pg_stat_user_tables estimates — null likewise. */
  rows: number | null;
};

type ColumnMeta = {
  name: string;
  dataType: string;
  udtName: string;
  nullable: boolean;
  default: string | null;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
};

/** SQL string literal (for standard_conforming_strings = on sessions). */
function q(value: string): string {
  return "'" + value.replace(/\0/g, "").replace(/'/g, "''") + "'";
}

/** Double-quoted identifier (PG doubling rule; Cockroach-compatible). */
function ident(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

/** Own pool (1 connection) so a long dump can't starve the app's pool.
 *
 *  The `types` override is scoped to this pool and is what makes the dump
 *  byte-faithful: by default pg parses date/time columns into JS `Date`
 *  (millisecond precision — Postgres keeps microseconds, so the round trip
 *  would silently truncate) and json/jsonb into parsed objects (re-serialised
 *  with different spacing). Passing those OIDs through as raw text keeps the
 *  exact stored rendering, which every Postgres-compatible server accepts as a
 *  literal. Scoped here, so the running app's own parsing is untouched.
 */
const RAW_TEXT_OIDS = new Set([
  1082, // date
  1083, // time
  1114, // timestamp
  1184, // timestamptz
  1266, // timetz
  114, // json
  3802, // jsonb
]);

function openPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSSL(),
    max: 1,
    types: {
      getTypeParser(oid, format) {
        if (RAW_TEXT_OIDS.has(oid) && format !== "binary") {
          return (raw: string) => raw;
        }
        return pgTypes.getTypeParser(oid, format);
      },
    },
  });
}

/** Probe query that answers with `fallback` when the server lacks the view
 *  (CockroachDB exposes less of pg_catalog than Postgres does). Only for
 *  metadata; data reads must use `must()` so nothing is silently truncated. */
async function probe<T>(client: Pool | { query: Pool["query"] }, sql: string, fallback: T): Promise<T> {
  try {
    const res = await client.query(sql);
    return (res.rows ?? []) as T;
  } catch {
    return fallback;
  }
}

/** Data-path query: any failure aborts the dump rather than losing rows. */
async function must<T>(client: { query: Pool["query"] }, sql: string): Promise<T> {
  const res = await client.query(sql);
  return res.rows as T;
}

function detectProduct(version: string): Product {
  return /cockroach/i.test(version) ? "cockroachdb" : "postgresql";
}

/* ─────────────────────────── type mapping ─────────────────────────── */

function sqlType(c: Pick<ColumnMeta, "dataType" | "udtName" | "maxLength" | "precision" | "scale">): string {
  switch (c.dataType) {
    case "character varying":
    case "varchar":
      return c.maxLength ? `character varying(${c.maxLength})` : "character varying";
    case "character":
    case "bpchar":
      return c.maxLength ? `character(${c.maxLength})` : "character";
    case "numeric":
      if (c.precision === null) return "numeric";
      return `numeric(${c.precision},${c.scale ?? 0})`;
    case "timestamp with time zone":
      return "timestamp with time zone";
    case "timestamp without time zone":
      return "timestamp without time zone";
    case "time with time zone":
      return "time with time zone";
    case "time without time zone":
      return "time without time zone";
    case "USER-DEFINED":
    case "ARRAY": {
      // Array udt names are the element name prefixed with `_` (`_text`).
      if (c.udtName.startsWith("_")) {
        const elem = c.udtName.slice(1);
        const elemType = sqlType({ ...c, udtName: elem, dataType: baseOf(elem) });
        return `${elemType}[]`;
      }
      return c.udtName;
    }
    default:
      return c.dataType;
  }
}

/** information_schema udt_name → the data_type string sqlType expects. */
function baseOf(udt: string): string {
  const map: Record<string, string> = {
    int2: "smallint",
    int4: "integer",
    int8: "bigint",
    float4: "real",
    float8: "double precision",
    bool: "boolean",
    varchar: "character varying",
    bpchar: "character",
    timestamptz: "timestamp with time zone",
    timestamp: "timestamp without time zone",
    timetz: "time with time zone",
    time: "time without time zone",
  };
  return map[udt] ?? udt;
}

/* ───────────────────────────────── meta ─────────────────────────────── */

export async function backupMeta(): Promise<BackupMeta> {
  const pool = openPool();
  try {
    const v = await probe<{ version: string }[]>(pool, "select version()", []);
    const product = detectProduct(v[0]?.version ?? "");
    const name = await probe<{ database: string }[]>(pool, "select current_database() as database", []);
    const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : "";
    const tables = await probe<{ n: string }[]>(
      pool,
      `select count(*)::text as n from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'`,
      [],
    );
    const size = await probe<{ size: string | null }[]>(
      pool,
      "select pg_database_size(current_database())::text as size",
      [],
    );
    const rows = await probe<{ n: string | null }[]>(
      pool,
      "select sum(n_live_tup)::text as n from pg_stat_user_tables where schemaname = 'public'",
      [],
    );
    return {
      product,
      version: v[0]?.version ?? "",
      database: name[0]?.database ?? "",
      host,
      tables: Number(tables[0]?.n ?? 0) || 0,
      bytes: size[0]?.size ? Number(size[0].size) : null,
      rows: rows[0]?.n ? Number(rows[0].n) : null,
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/* ──────────────────────────────── schema ────────────────────────────── */

async function schemaSql(pool: Pool): Promise<string> {
  const out: string[] = [];

  const tables = (
    await must<{ table_name: string }[]>(
      pool,
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
    )
  ).map((r) => r.table_name);
  if (tables.length === 0) return "-- (no tables found)\n";

  const cols = await must<(ColumnMeta & { table_name: string })[]>(
    pool,
    `select table_name, column_name as name, data_type as "dataType", udt_name as "udtName",
            is_nullable as nullable, column_default as "default",
            character_maximum_length as "maxLength", numeric_precision as precision, numeric_scale as scale
     from information_schema.columns where table_schema = 'public'
     order by table_name, ordinal_position`,
  );
  for (const c of cols) c.nullable = c.nullable === true || c.nullable === ("YES" as unknown);
  const columnsByTable = new Map<string, ColumnMeta[]>();
  for (const c of cols) {
    const list = columnsByTable.get(c.table_name) ?? [];
    list.push(c);
    columnsByTable.set(c.table_name, list);
  }

  const pkRows = await must<{ table_name: string; constraint_name: string; column_name: string }[]>(
    pool,
    `select tc.table_name, tc.constraint_name, kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
     order by tc.table_name, kcu.ordinal_position`,
  );
  const pks = new Map<string, string[]>();
  const pkConstraintNames = new Set<string>();
  for (const r of pkRows) {
    const list = pks.get(r.table_name) ?? [];
    list.push(r.column_name);
    pks.set(r.table_name, list);
    pkConstraintNames.add(r.constraint_name);
  }

  const fkRows = await must<
    {
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table: string;
      foreign_column: string;
      delete_rule: string | null;
      update_rule: string | null;
    }[]
  >(
    pool,
    `select tc.table_name, tc.constraint_name, kcu.column_name,
            ccu.table_name as foreign_table, ccu.column_name as foreign_column,
            rc.delete_rule, rc.update_rule
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     join information_schema.constraint_column_usage ccu
       on tc.constraint_name = ccu.constraint_name and tc.constraint_schema = ccu.constraint_schema
     left join information_schema.referential_constraints rc
       on tc.constraint_name = rc.constraint_name and tc.constraint_schema = rc.constraint_schema
     where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
     order by tc.table_name, tc.constraint_name, kcu.ordinal_position`,
  );
  const fks = new Map<string, typeof fkRows>();
  for (const r of fkRows) {
    const list = fks.get(r.constraint_name) ?? [];
    list.push(r);
    fks.set(r.constraint_name, list);
  }

  const uniqRows = await must<{ table_name: string; constraint_name: string; column_name: string }[]>(
    pool,
    `select tc.table_name, tc.constraint_name, kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
     where tc.constraint_type = 'UNIQUE' and tc.table_schema = 'public'
     order by tc.table_name, tc.constraint_name, kcu.ordinal_position`,
  );
  const uniqs = new Map<string, { table: string; columns: string[] }>();
  for (const r of uniqRows) {
    const u = uniqs.get(r.constraint_name) ?? { table: r.table_name, columns: [] };
    u.columns.push(r.column_name);
    uniqs.set(r.constraint_name, u);
  }
  // Indexes backed by a constraint are re-created by the constraint itself;
  // emitting them again would just create duplicates.
  const constraintBacked = new Set<string>([...pkConstraintNames, ...uniqs.keys(), ...fks.keys()]);

  // Table-level CHECK constraints, verbatim from pg_get_constraintdef (it
  // quotes identifiers correctly, unlike information_schema.check_constraints,
  // which also lists NOT NULL constraints with unquoted names — those are
  // already covered by the NOT NULL in each column definition).
  const checkRows = await probe<{ table_name: string; constraint_name: string; def: string }[]>(
    pool,
    `select pc.relname as table_name, con.conname as constraint_name, pg_get_constraintdef(con.oid) as def
     from pg_constraint con
     join pg_class pc on pc.oid = con.conrelid
     join pg_namespace pn on pn.oid = pc.relnamespace
     where pn.nspname = 'public' and con.contype = 'c'
     order by pc.relname, con.conname`,
    [],
  );

  const indexRows = await must<{ tablename: string; indexname: string; indexdef: string }[]>(
    pool,
    `select tablename, indexname, indexdef from pg_indexes
     where schemaname = 'public' order by tablename, indexname`,
  );

  // Enums actually used by a column, in definition order.
  const enumRows = await probe<{ typname: string; labels: string[] }[]>(
    pool,
    `select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
     from pg_type t join pg_enum e on e.enumtypid = t.oid
     join pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
     group by t.typname order by t.typname`,
    [],
  );
  const usedEnums = new Set(cols.map((c) => c.udtName).filter((u) => !u.startsWith("_")));
  const enumDdl = enumRows
    .filter((e) => usedEnums.has(e.typname))
    .map((e) =>
      `DO $enum$ BEGIN\n  CREATE TYPE ${e.typname} AS ENUM (${e.labels.map(q).join(", ")});\n` +
        `EXCEPTION WHEN duplicate_object THEN NULL; END $enum$;`,
    );

  const seqRows = cols.some((c) => (c.default ?? "").includes("nextval"))
    ? await probe<{ sequencename: string; start_value: string }[]>(
        pool,
        `select sequencename, start_value::text from pg_sequences where schemaname = 'public' order by sequencename`,
        [],
      )
    : [];

  /* emit */
  out.push(
    "-- ────────────────────────── SCHEMA ──────────────────────────",
    "-- Shape comes from the live database (information_schema), so the file",
    "-- matches its own data. Restoring into a schema built by `drizzle-kit",
    "-- push` also works: everything is IF NOT EXISTS / duplicate-tolerant.",
    "",
  );
  if (enumDdl.length) out.push(...enumDdl, "");
  if (seqRows.length) {
    out.push("-- sequences referenced by column defaults");
    for (const s of seqRows) {
      out.push(`CREATE SEQUENCE IF NOT EXISTS ${ident(s.sequencename)} AS bigint START WITH ${s.start_value};`);
    }
    out.push("");
  }

  for (const t of tables) {
    const cs = columnsByTable.get(t) ?? [];
    if (cs.length === 0) continue;
    const pk = pks.get(t);
    const lines = cs.map((c) => {
      const parts = [`  ${ident(c.name)} ${sqlType(c)}`];
      if (c.default !== null) parts.push(`DEFAULT ${c.default}`);
      if (!c.nullable) parts.push("NOT NULL");
      return parts.join(" ");
    });
    if (pk && pk.length > 0) lines.push(`  PRIMARY KEY (${pk.map(ident).join(", ")})`);
    out.push(`CREATE TABLE IF NOT EXISTS ${ident(t)} (`, lines.join(",\n"), ");", "");
  }

  for (const idx of indexRows) {
    if (constraintBacked.has(idx.indexname)) continue;
    out.push(idx.indexdef.replace(/^(CREATE (?:UNIQUE )?INDEX )/i, "$1IF NOT EXISTS ") + ";");
  }
  if (indexRows.length) out.push("");

  if (uniqs.size) {
    out.push("-- unique constraints");
    for (const [name, u] of uniqs) {
      out.push(
        `DO $u$ BEGIN\n  ALTER TABLE ${ident(u.table)} ADD CONSTRAINT ${ident(name)} UNIQUE (${u.columns.map(ident).join(", ")});\n` +
          `EXCEPTION WHEN duplicate_object THEN NULL; END $u$;`,
      );
    }
    out.push("");
  }

  if (checkRows.length) {
    out.push("-- check constraints");
    for (const c of checkRows) {
      out.push(
        `DO $c$ BEGIN\n  ALTER TABLE ${ident(c.table_name)} ADD CONSTRAINT ${ident(c.constraint_name)} ${c.def};\n` +
          `EXCEPTION WHEN duplicate_object THEN NULL; END $c$;`,
      );
    }
    out.push("");
  }

  return out.join("\n") + "\n";
}

/* ──────────────────────────────── data ─────────────────────────────── */

function literal(v: unknown, c: ColumnMeta): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) {
    return `'\\x${Buffer.from(v).toString("hex")}'::bytea`;
  }
  if (v instanceof Date) {
    // Fallback only: the dump pool passes date/time columns through as raw
    // text (see RAW_TEXT_OIDS), so this branch never fires for them.
    if (c.dataType === "date" || c.udtName === "date") return `'${v.toISOString().slice(0, 10)}'`;
    return `'${v.toISOString()}'`;
  }
  if (Array.isArray(v)) {
    // pg parses array columns into JS arrays; rebuild a typed ARRAY literal.
    const elemUdt = c.udtName.startsWith("_") ? c.udtName.slice(1) : c.udtName;
    const elem: ColumnMeta = { ...c, udtName: elemUdt, dataType: baseOf(elemUdt) };
    return `ARRAY[${v.map((item) => (item === null ? "NULL" : literal(item, elem))).join(", ")}]::${sqlType(c)}`;
  }
  if (typeof v === "object") {
    // json / jsonb also arrive as raw text from the dump pool; the Date case
    // above covers any parsed object that slips through.
    return q(JSON.stringify(v));
  }
  return q(String(v));
}

/** Tables ordered FK-first so even without `session_replication_role` the
 *  load satisfies constraints; cycles end up in one harmless trailing group
 *  because FKs are created after the data anyway. */
function dependencyOrder(tables: string[], fks: { table: string; foreign_table: string }[]): string[] {
  const deps = new Map<string, Set<string>>(tables.map((t) => [t, new Set()]));
  for (const f of fks) {
    if (f.table !== f.foreign_table && deps.has(f.table) && deps.has(f.foreign_table)) {
      deps.get(f.table)!.add(f.foreign_table);
    }
  }
  const done = new Set<string>();
  const order: string[] = [];
  let remaining = [...tables];
  while (remaining.length) {
    const ready = remaining.filter((t) => [...deps.get(t)!].every((d) => done.has(d)));
    if (ready.length === 0) {
      order.push(...remaining);
      break;
    }
    for (const t of ready) {
      done.add(t);
      order.push(t);
    }
    remaining = remaining.filter((t) => !done.has(t));
  }
  return order;
}

async function* dataStatements(pool: Pool, tables: string[]): AsyncGenerator<string> {
  const client = await pool.connect();
  try {
    // One snapshot for the whole dump: every table is read at the same
    // instant, and LIMIT/OFFSET pagination is stable inside it. READ ONLY so
    // the dump cannot mutate anything even by accident.
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ, READ ONLY");

    for (const table of tables) {
      const cols = (
        await must<ColumnMeta[]>(
          client,
          `select column_name as name, data_type as "dataType", udt_name as "udtName",
                  is_nullable as nullable, column_default as "default",
                  character_maximum_length as "maxLength", numeric_precision as precision, numeric_scale as scale
           from information_schema.columns
           where table_schema = 'public' and table_name = ${q(table)}
           order by ordinal_position`,
        )
      ).map((c) => ({ ...c, nullable: c.nullable === true }));
      if (cols.length === 0) continue;

      const pk = await must<{ column_name: string }[]>(
        client,
        `select kcu.column_name
         from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
           on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
         where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public' and tc.table_name = ${q(table)}
         order by kcu.ordinal_position`,
      );
      const singlePk = pk.length === 1 ? cols.find((c) => c.name === pk[0].column_name) : undefined;

      const colList = cols.map((c) => ident(c.name)).join(", ");
      let total = 0;

      if (singlePk) {
        let cursor: unknown = null;
        for (;;) {
          const where = cursor === null ? "" : ` where ${ident(singlePk.name)} > ${literal(cursor, singlePk)}`;
          const page = await must<Record<string, unknown>[]>(
            client,
            `select * from ${ident(table)}${where} order by ${ident(singlePk.name)} asc limit ${PAGE_ROWS}`,
          );
          if (page.length === 0) break;
          yield rowsToInsert(table, colList, cols, page);
          total += page.length;
          cursor = page[page.length - 1][singlePk.name];
          if (page.length < PAGE_ROWS) break;
        }
      } else {
        for (let offset = 0; ; offset += PAGE_ROWS) {
          const page = await must<Record<string, unknown>[]>(
            client,
            `select * from ${ident(table)} limit ${PAGE_ROWS} offset ${offset}`,
          );
          if (page.length === 0) break;
          yield rowsToInsert(table, colList, cols, page);
          total += page.length;
          if (page.length < PAGE_ROWS) break;
        }
      }
      yield `-- ${table}: ${total} row(s)\n\n`;
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function rowsToInsert(
  table: string,
  colList: string,
  cols: ColumnMeta[],
  rows: Record<string, unknown>[],
): string {
  const byName = new Map(cols.map((c) => [c.name, c]));
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i += CHUNK_ROWS) {
    const chunk = rows.slice(i, i + CHUNK_ROWS);
    const values = chunk
      .map((row) => `  (${cols.map((c) => literal(row[c.name], c)).join(", ")})`)
      .join(",\n");
    lines.push(`INSERT INTO ${ident(table)} (${colList}) VALUES\n${values};`);
  }
  return lines.join("\n") + "\n";
}

/* ─────────────────────────────── the dump ───────────────────────────── */

async function* dumpStatements(): AsyncGenerator<string> {
  const pool = openPool();
  try {
    const v = await probe<{ version: string }[]>(pool, "select version()", []);
    const product = detectProduct(v[0]?.version ?? "");
    const name = await probe<{ database: string }[]>(pool, "select current_database() as database", []);

    yield (
      `-- Nomarc database backup\n` +
      `-- generated:  ${new Date().toISOString()}\n` +
      `-- product:    ${product}${v[0]?.version ? ` (${v[0].version.split(" on ")[0].trim()})` : ""}\n` +
      `-- database:   ${name[0]?.database ?? ""}\n` +
      `--\n` +
      `-- Restore into an EMPTY database:\n` +
      `--   psql "$DATABASE_URL" -f this-file.sql\n` +
      `--   npm run db:restore -- this-file.sql\n` +
      `-- Also idempotent against an existing (drizzle-pushed) schema; restoring\n` +
      `-- over a POPULATED database would duplicate rows.\n` +
      `-- Secrets (BETTER_AUTH_SECRET, JWT_SECRET, R2_*, SMTP_*) are not in the\n` +
      `-- database — carry the deployment env over separately.\n` +
      `\n` +
      `SET client_encoding = 'UTF8';\n` +
      `SET TimeZone = 'UTC';\n` +
      `SET standard_conforming_strings = on;\n` +
      `\n`
    );

    const tables = (
      await must<{ table_name: string }[]>(
        pool,
        `select table_name from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
      )
    ).map((r) => r.table_name);

    try {
      yield await schemaSql(pool);
    } catch (err) {
      yield (
        `-- ⚠ schema DDL could not be generated (${err instanceof Error ? err.message : String(err)}).\n` +
        `-- Build the schema from the repo instead (drizzle-kit push + Better Auth\n` +
        `-- migration), then load the data section below.\n\n`
      );
    }

    yield "\n-- ────────────────────────── DATA ──────────────────────────\n\n";
    try {
      const fkRows = await probe<{ table_name: string; foreign_table: string }[]>(
        pool,
        `select tc.table_name, ccu.table_name as foreign_table
         from information_schema.table_constraints tc
         join information_schema.constraint_column_usage ccu
           on tc.constraint_name = ccu.constraint_name and tc.constraint_schema = ccu.constraint_schema
         where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`,
        [],
      );
      yield* dataStatements(
        pool,
        dependencyOrder(
          tables,
          fkRows.map((r) => ({ table: r.table_name, foreign_table: r.foreign_table })),
        ),
      );
    } catch (err) {
      yield `-- ⚠ data dump aborted: ${err instanceof Error ? err.message : String(err)}\n`;
    }

    // Foreign keys last: load order never matters, and each one tolerates an
    // already-existing constraint (restore over a drizzle-pushed schema).
    yield "\n-- ───────────────── FOREIGN KEYS (after data) ─────────────────\n\n";
    const fkRows = await probe<
      {
        table_name: string;
        constraint_name: string;
        column_name: string;
        foreign_table: string;
        foreign_column: string;
        delete_rule: string | null;
        update_rule: string | null;
      }[]
    >(
      pool,
      `select tc.table_name, tc.constraint_name, kcu.column_name,
              ccu.table_name as foreign_table, ccu.column_name as foreign_column,
              rc.delete_rule, rc.update_rule
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
       join information_schema.constraint_column_usage ccu
         on tc.constraint_name = ccu.constraint_name and tc.constraint_schema = ccu.constraint_schema
       left join information_schema.referential_constraints rc
         on tc.constraint_name = rc.constraint_name and tc.constraint_schema = rc.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
       order by tc.table_name, tc.constraint_name, kcu.ordinal_position`,
      [],
    );
    const grouped = new Map<string, typeof fkRows>();
    for (const r of fkRows) {
      const list = grouped.get(r.constraint_name) ?? [];
      list.push(r);
      grouped.set(r.constraint_name, list);
    }
    for (const [name, rows] of grouped) {
      const first = rows[0];
      const columns = rows.map((r) => ident(r.column_name)).join(", ");
      const foreign = rows.map((r) => ident(r.foreign_column)).join(", ");
      const rules =
        (first.update_rule && first.update_rule !== "NO ACTION" ? ` ON UPDATE ${first.update_rule}` : "") +
        (first.delete_rule && first.delete_rule !== "NO ACTION" ? ` ON DELETE ${first.delete_rule}` : "");
      yield (
        `DO $fk$ BEGIN\n` +
        `  ALTER TABLE ${ident(first.table_name)} ADD CONSTRAINT ${ident(name)}\n` +
        `    FOREIGN KEY (${columns}) REFERENCES ${ident(first.foreign_table)} (${foreign})${rules};\n` +
        `EXCEPTION WHEN duplicate_object THEN NULL; END $fk$;\n`
      );
    }

    // Sequence positions, so generated ids resume where the source left off.
    const seqRows = await probe<{ sequencename: string; last_value: string | null }[]>(
      pool,
      `select sequencename, last_value::text from pg_sequences
       where schemaname = 'public' and last_value is not null order by sequencename`,
      [],
    );
    if (seqRows.length) {
      yield "\n-- sequence positions\n";
      for (const s of seqRows) {
        yield `SELECT setval(${q(s.sequencename)}, ${s.last_value}, true);\n`;
      }
    }
    yield "\nANALYZE;\n";
  } finally {
    await pool.end().catch(() => {});
  }
}

/** Filename for this dump, e.g. nomarc-backup-2026-11-16T07-12-30.sql */
export function backupFileName(): string {
  return `nomarc-backup-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.sql`;
}

/** The whole dump as a web ReadableStream (constant memory, one snapshot). */
export function backupStream(): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from(dumpStatements())) as unknown as ReadableStream<Uint8Array>;
}
