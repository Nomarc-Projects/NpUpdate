const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: m.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const exp = fs.readFileSync("/home/lw/Documents/Nomarc-main/data/expected-row-counts.txt", "utf8");
  const want = [];
  for (const line of exp.split(/\r?\n/)) {
    const mm = /^\s*(\d+)\s+(\S+)\s*$/.exec(line);
    if (mm) want.push([mm[2], +mm[1]]);
  }
  let ok = 0, bad = 0;
  for (const [t, n] of want) {
    let got;
    try { got = (await c.query(`select count(*)::int n from "${t.replace(/"/g, '""')}"`)).rows[0].n; }
    catch (e) { console.log(`  ${t}: ERROR ${e.message.split("\n")[0]}`); bad++; continue; }
    if (got === n) { ok++; }
    else { console.log(`  MISMATCH ${t}: expected ${n}, got ${got} (diff ${got - n})`); bad++; }
  }
  console.log(`verified ${ok}/${want.length} expected tables match; mismatches: ${bad}`);
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
