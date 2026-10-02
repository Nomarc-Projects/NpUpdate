const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  // Does drizzle track applied migrations?
  try {
    const t = await c.query(`select table_name from information_schema.tables where table_schema='public' and table_name ilike '%migration%'`);
    console.log("migration tables:", JSON.stringify(t.rows));
    const m = await c.query(`select id, hash from drizzle.__drizzle_migrations order by created_at`);
    console.log("drizzle migrations applied:", m.rows.length, JSON.stringify(m.rows.slice(-6)));
  } catch(e){ console.log("drizzle table query:", e.message); }
  // Check Aug30 schema objects
  const cols = await c.query(`select table_name, column_name from information_schema.columns
    where column_name in ('practice_status','registration_number','licence_status')
    order by table_name, column_name`);
  console.log("aug30 columns:", JSON.stringify(cols.rows));
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
