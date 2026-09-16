import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "../lib/db/schema.ts";

const sql = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

const dbCols = new Map();
const tables = await sql.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'");
for (const r of tables.rows) {
  if (!dbCols.has(r.table_name)) dbCols.set(r.table_name, new Set());
  dbCols.get(r.table_name).add(r.column_name);
}

const TYPE_MAP = {
  PgText: "text", PgVarchar: "text", PgUUID: "uuid", PgBoolean: "boolean",
  PgInteger: "integer", PgSmallint: "smallint", PgBigInt: "bigint",
  PgDoublePrecision: "double precision", PgNumeric: "numeric", PgReal: "real",
  PgTimestamp: "timestamptz", PgDate: "date", PgJsonb: "jsonb", PgJson: "json",
};

let missingTotal = 0;
for (const [name, t] of Object.entries(schema)) {
  if (!is(t, PgTable)) continue;
  const tn = getTableName(t);
  const have = dbCols.get(tn);
  if (!have) { console.log(`TABLE MISSING: ${tn}`); missingTotal++; continue; }
  for (const [key, col] of Object.entries(t)) {
    if (!col || typeof col !== "object" || !("name" in col) || !col.columnType) continue;
    if (!have.has(col.name)) {
      const type = TYPE_MAP[col.columnType] ?? "text";
      console.log(`${tn}.${col.name} (${type}) MISSING — schema key ${name}.${key}`);
      missingTotal++;
    }
  }
}
console.log(missingTotal === 0 ? "NO COLUMN DRIFT" : `\n${missingTotal} issue(s)`);
await sql.end();
process.exit(0);
