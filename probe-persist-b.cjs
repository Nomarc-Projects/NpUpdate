const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`select k,v from _persist_test where k='marker'`);
  console.log("FRESH process reads marker:", JSON.stringify(r.rows));
  const nu = await c.query(`select count(*)::int as n from "user"`);
  console.log("user count now:", nu.rows[0].n);
  const np = await c.query(`select count(*)::int as n from profile`);
  console.log("profile count now:", np.rows[0].n);
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
