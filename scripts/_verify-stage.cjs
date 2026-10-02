const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: m.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tabs = (await c.query(`select table_name from information_schema.tables where table_schema='import_stage' order by table_name`)).rows;
  const rows = [];
  for (const { table_name: t } of tabs) {
    const n = (await c.query(`select count(*)::int n from "import_stage"."${t.replace(/"/g, '""')}"`)).rows[0].n;
    rows.push([t, n]);
  }
  fs.writeFileSync("/tmp/opencode/stage_counts.json", JSON.stringify(rows));
  const map = {}; for (const [t, n] of rows) map[t] = n;
  const exp = fs.readFileSync("/home/lw/Documents/Nomarc-main/data/expected-row-counts.txt", "utf8");
  let mism = 0, total = 0;
  for (const line of exp.split(/\r?\n/)) {
    const mm = /^\s*(\d+)\s+(\S+)\s*$/.exec(line);
    if (!mm) continue;
    const n = +mm[1], t = mm[2]; total += n;
    const got = map[t];
    if (got === undefined) { console.log("MISSING from dump (-):", t, "expected", n); mism++; }
    else if (got !== n) { console.log("MISMATCH:", t, "exp", n, "got", got, "diff", got - n); mism++; }
  }
  const withData = rows.filter(([, n]) => n > 0).length;
  console.log("tables with data in dump/stage:", withData);
  console.log("expected-total:", total, "mismatches:", mism);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
