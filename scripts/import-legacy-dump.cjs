#!/usr/bin/env node
/**
 * Merge data from the old-server full SQL dump (data/nomarc-full.sql) into the
 * CURRENT CockroachDB (production, from .env DATABASE_URL).
 *
 * Strategy (robust — the DB engine does the SQL parsing, no manual tokenizer):
 *   1. Create a temporary staging schema (STAGE_SCHEMA) in the target DB.
 *   2. Run the dump's CREATE TABLE statements rewritten to the staging schema,
 *      and the dump's INSERT statements with search_path = staging. (The dump's
 *      ALTER TABLE ... ADD CONSTRAINT / VALIDATE lines are skipped so staging
 *      has no FK constraints and any insert order works.)
 *   3. Copy each staging table into the matching public table, projecting onto
 *      the intersection of columns and using ON CONFLICT (pk) DO NOTHING so
 *      existing rows are never clobbered and re-runs are idempotent.
 *   4. Insert parents before children (from the target DB's FK constraints).
 *   5. Report inserted/skipped counts, then DROP the staging schema.
 *
 * Use --dry to only report the copy plan without touching the DB.
 * Use --keep-stage to leave the staging schema in place after the copy.
 * Use -t a,b to restrict to a subset of tables.
 */
const fs = require("fs");
const path = require("path");

let DRY = process.argv.includes("--dry");
const KEEP = process.argv.includes("--keep-stage");
const tabIdx = process.argv.indexOf("-t");
let ONLY_TABLES = null;
if (tabIdx >= 0 && process.argv[tabIdx + 1]) ONLY_TABLES = process.argv[tabIdx + 1].split(",").map((s) => s.trim()).filter(Boolean);

const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {};
env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });

const DUMP_PATH = path.join(__dirname, "..", "..", "data", "nomarc-full.sql");
const STAGE = process.env.IMPORT_STAGE_SCHEMA || "import_stage";
const { Client } = require("pg");

// Split raw SQL into statements at top-level ';' respecting string/quote state.
function splitStatements(sql) {
  const stmts = []; let cur = ""; let inSq = false; let inDq = false; let inDollar = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]; const next = sql[i + 1];
    if (inDollar) { cur += ch; if (sql.startsWith(inDollar, i)) { cur += inDollar; i += inDollar.length; inDollar = null; } continue; }
    if (inSq) { cur += ch; if (ch === "'") { if (next === "'") { cur += "'"; i += 2; continue; } inSq = false; } continue; }
    if (inDq) { cur += ch; if (ch === '"') { if (next === '"') { cur += '"'; i += 2; continue; } inDq = false; } continue; }
    if (ch === "$" && /^\$[A-Za-z0-9_]*\$/.test(sql.slice(i))) { const dl = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i))[0]; inDollar = dl; cur += dl; i += dl.length; continue; }
    if (ch === "'") { inSq = true; cur += ch; continue; }
    if (ch === '"') { inDq = true; cur += ch; continue; }
    if (ch === ";") { stmts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim() !== "") stmts.push(cur);
  return stmts;
}

async function main() {
  const sql = fs.readFileSync(DUMP_PATH, "utf8");
  const stmts = splitStatements(sql);
  const creates = [];
  const inserts = [];
  for (const s of stmts) {
    const head = s.replace(/^--[^\n]*\n/gm, "");
    if (/^\s*CREATE TABLE/i.test(head)) creates.push(s);
    else if (/^\s*INSERT\s+INTO/i.test(head)) inserts.push(s);
    // ALTER TABLE ... ADD CONSTRAINT / VALIDATE are intentionally skipped.
  }
  console.log(`dump: ${creates.length} CREATE TABLE, ${inserts.length} INSERT statements`);

  const c = new Client({ connectionString: m.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // target columns + pk + fk edges from public schema
  const targetCols = new Map();
  const pks = new Map();
  const allTables = await c.query("select table_name from information_schema.tables where table_schema='public'");
  for (const { table_name } of allTables.rows) {
    const cols = (await c.query(`select column_name from information_schema.columns where table_schema='public' and table_name='${table_name.replace(/'/g, "''")}'`)).rows.map((r) => r.column_name);
    targetCols.set(table_name, cols);
    const pk = (await c.query(`select a.attname from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid='"${table_name}"'::regclass and i.indisprimary`)).rows.map((r) => r.attname);
    pks.set(table_name, pk);
  }
  const fk = await c.query(`select tc.table_name child, ccu.table_name parent,
     kcu.column_name child_col, ccu.column_name parent_col
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
     join information_schema.constraint_column_usage ccu on tc.constraint_name=ccu.constraint_name and tc.table_schema=ccu.table_schema
     where tc.constraint_type='FOREIGN KEY' and tc.table_schema='public'`);
  const edges = new Map();
  const fkCols = new Map();
  for (const r of fk.rows) {
    if (!edges.has(r.child)) edges.set(r.child, new Set());
    edges.get(r.child).add(r.parent);
    if (!fkCols.has(r.child)) fkCols.set(r.child, []);
    fkCols.get(r.child).push({ childCol: r.child_col, parent: r.parent, parentCol: r.parent_col });
  }

  // which tables have data in the dump
  const dumpTables = new Set();
  for (const ins of inserts) { const mm = /INSERT\s+INTO\s+"([a-zA-Z_]+)"/.exec(ins); if (mm) dumpTables.add(mm[1]); }

  // staging tables to create = intersection of dump CREATE TABLE and target public
  const stageCreate = [];
  for (const cr of creates) {
    const mm = /^\s*CREATE TABLE public\.\s*"?([a-zA-Z_]+)"?/.exec(cr.replace(/^--[^\n]*\n/gm, ""));
    if (!mm) continue;
    const t = mm[1];
    if (!targetCols.has(t)) { console.log(`skip staging ${t}: not in target DB`); continue; }
    if (ONLY_TABLES && !ONLY_TABLES.includes(t)) continue;
    stageCreate.push(cr.trim().replace(/\bpublic\./g, `${STAGE}.`));
  }
  console.log(`will create ${stageCreate.length} staging tables.`);
  console.log(`(${creates.length} create statements scanned)`);

  // ---------------------------------------------
  if (DRY) {
    console.log("\n[DRY RUN] staging + copy plan:");
    const stageTables = stageCreate.map((cr) => { const mm = /CREATE TABLE [A-Za-z0-9_]+\.\s*"?([a-zA-Z_]+)"?/.exec(cr); return mm ? mm[1] : null; }).filter(Boolean);
    for (const t of stageTables) {
      const dbCols = targetCols.get(t) || [];
      // dump columns we can't know without creating staging, so report target pk
      console.log(`  copy ${t} -> public.${t}  (pk=${(pks.get(t) || []).join(",") || "-"})`);
    }
    console.log("\n  NOTE: exact per-column projection is computed during the real run.");
    await c.end();
    return;
  }
  // ---------------------------------------------

  // 1. create staging schema
  console.log(`creating staging schema "${STAGE}"...`);
  await c.query(`DROP SCHEMA IF EXISTS "${STAGE}" CASCADE`);
  await c.query(`CREATE SCHEMA "${STAGE}"`);
  // 2. create staging tables
  for (const cr of stageCreate) {
    await c.query(cr);
  }
  console.log(`staging tables created (${stageCreate.length}).`);

  // 3. load data, with search_path = staging so INSERT INTO "user" hits staging.user
  await c.query(`SET search_path TO "${STAGE}", public`);
  let loadErr = 0; let stmtCount = 0;
  for (const ins of inserts) {
    const head = ins.replace(/^--[^\n]*\n/gm, "");
    const mm = /^\s*INSERT\s+INTO\s+"([a-zA-Z_]+)"/.exec(head);
    if (!mm) continue;
    if (!dumpTables.has(mm[1])) continue;
    if (!targetCols.has(mm[1])) continue;
    if (ONLY_TABLES && !ONLY_TABLES.includes(mm[1])) continue;
    if (!stageCreate.some((cr) => new RegExp(`CREATE TABLE ${STAGE}\\.\\s*"?${mm[1]}"?`).test(cr))) continue;
    try {
      await c.query(ins);
      stmtCount++;
    } catch (e) {
      loadErr++;
      console.error(`  load error ${mm[1]}: ${e.message}`);
    }
  }
  console.log(`data loaded: ${stmtCount} statements OK, ${loadErr} errors.`);

  const tableOf = (cr) => { const mm = /CREATE TABLE [A-Za-z0-9_]+\.\s*"?([a-zA-Z_]+)"?/.exec(cr); return mm ? mm[1] : null; };

  const LOAD_ONLY = process.argv.includes("--load-only");
  if (LOAD_ONLY) {
    console.log(`\n[--load-only] staging loaded; verifying row sums, leaving schema "${STAGE}" in place.`);
    let totalRows = 0;
    for (const cr of stageCreate) {
      const t = tableOf(cr);
      if (!t) continue;
      const n = (await c.query(`select count(*)::int c from "${STAGE}"."${t}"`)).rows[0].c;
      totalRows += n;
    }
    console.log(`total rows loaded into ${STAGE}: ${totalRows}`);
    await c.end();
    return;
  }

  // 4. copy staging -> public, projection + on conflict, parents before children
  const created = stageCreate.map(tableOf).filter(Boolean);
  const createdSet = new Set(created);
  const order = [];
  const visited = new Set();
  const visit = (t) => {
    if (visited.has(t)) return;
    visited.add(t);
    for (const p of edges.get(t) || []) if (createdSet.has(p)) visit(p);
    order.push(t);
  };
  for (const t of created) visit(t);

  const total = { inserted: 0, skipped: 0 };
  // ensure unqualified names resolve to public for the copy
  await c.query(`RESET search_path`);
  for (const t of order) {
    const cr = stageCreate.find((c) => tableOf(c) === t);
    if (!cr) continue;
    const dbCols = targetCols.get(t);
    const stageCols = (await c.query(`select column_name from information_schema.columns where table_schema='${STAGE.replace(/'/g, "''")}' and table_name='${t.replace(/'/g, "''")}'`)).rows.map((r) => r.column_name);
    const shared = stageCols.filter((col) => dbCols.includes(col));
    if (shared.length === 0) { console.log(`  ${t}: no shared columns, skip`); continue; }
    const cntStage = await c.query(`select count(*)::int c from "${STAGE}"."${t}"`);
    const colList = shared.map((col) => `"${col}"`).join(", ");
    const srcList = shared.map((col) => `s."${col}"`).join(", ");
    // alias source as s so we can filter on FK parents
    let insert = `INSERT INTO public."${t}" (${colList}) SELECT ${srcList} FROM "${STAGE}"."${t}" s`;
    // FK-aware filter: only insert rows whose FK parents already exist in public
    const fkFilters = [];
    for (const e of fkCols.get(t) || []) {
      if (!createdSet.has(e.parent)) continue;
      fkFilters.push(`s."${e.childCol}" IN (SELECT "${e.parentCol}" FROM public."${e.parent}")`);
    }
    if (fkFilters.length) insert += "\nWHERE " + fkFilters.join(" AND ");
    // ON CONFLICT DO NOTHING (no target) skips any pk or unique-conflict row
    insert += `\nON CONFLICT DO NOTHING`;
    let r;
    try {
      r = await c.query(insert);
    } catch (e) {
      console.error(`  copy ${t}: ERROR ${e.message.split("\n")[0]}`);
      continue;
    }
    const got = (r.rowCount || 0) + (r.rowCount === null ? cntStage.rows[0].c : 0);
    console.log(`  ${t}: stage=${cntStage.rows[0].c} inserted=${r.rowCount ?? "?"}${fkFilters.length ? " (fk-filtered)" : ""}`);
    total.inserted += r.rowCount || 0;
  }

  const finalCounts = {};
  for (const cr of stageCreate) {
    const mm = /CREATE TABLE [A-Za-z0-9_]+\.\s*"?([a-zA-Z_]+)"?/.exec(cr);
    const t = mm ? mm[1] : null;
    if (t) finalCounts[t] = (await c.query(`select count(*)::int c from public."${t}"`)).rows[0].c;
  }
  console.log("\nPublic row counts after merge:");
  for (const [t, n] of Object.entries(finalCounts).sort()) console.log(`  ${t}: ${n}`);

  if (!KEEP) {
    await c.query(`DROP SCHEMA "${STAGE}" CASCADE`);
    console.log(`dropped staging schema "${STAGE}".`);
  } else {
    console.log(`kept staging schema "${STAGE}" (--keep-stage).`);
  }
  await c.end();
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
