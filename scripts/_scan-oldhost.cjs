const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: m.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cols = (await c.query(`select table_name t, column_name col from information_schema.columns where table_schema='public' and data_type in ('character varying','text','character')`)).rows;
  let total = 0; const res = [];
  for (const { t, col } of cols) {
    let n;
    try { n = (await c.query(`select count(*)::int n from "${t.replace(/"/g, '""')}" where "${col.replace(/"/g, '""')}" like '%746d856e5d4c4916a1f61dbd99ff2f33%'`)).rows[0].n; }
    catch { continue; }
    if (n > 0) { res.push(`${t}.${col}=${n}`); total += n; }
  }
  console.log(`remaining old-host refs: ${total}${res.length ? " (" + res.join(", ") + ")" : ""}`);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
