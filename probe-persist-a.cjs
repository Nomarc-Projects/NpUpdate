const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cur = await c.query(`select current_database() as db, version()`);
  console.log("DB:", cur.rows[0].db, "|", cur.rows[0].version.slice(0,60));
  const tg = await c.query(`select tgname, tgrelid::regclass as tbl from pg_trigger where not tgisinternal`);
  console.log("triggers:", JSON.stringify(tg.rows));
  await c.query(`create table if not exists _persist_test (k text primary key, v text)`);
  await c.query(`upsert into _persist_test(k,v) values ('marker','alive-'||now()::text)`);
  const r = await c.query(`select k,v from _persist_test where k='marker'`);
  console.log("WROTE marker in pid", process.pid, "->", JSON.stringify(r.rows[0]));
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
