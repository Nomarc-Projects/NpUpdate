const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cur = await c.query(`select current_database() as db`);
  const u = await c.query(`select id,email,name,role from "user" order by email`);
  console.log("db:", cur.rows[0].db, "| USER COUNT:", u.rows.length);
  for (const r of u.rows) console.log("  ", JSON.stringify({id:r.id.slice(0,8), email:r.email, role:r.role}));
  const p = await c.query(`select u.email, count(p."userId")::int as n from "user" u left join profile p on p."userId"=u.id group by u.email order by u.email`);
  console.log("profiles by user:", JSON.stringify(p.rows));
  const g = await c.query(`select
    (select count(*)::int from profile) profiles,(select count(*)::int from "user") users,
    (select count(*)::int from product) products,(select count(*)::int from job) jobs,
    (select count(*)::int from company) companies,(select count(*)::int from project) projects`);
  console.log("GLOBAL:", JSON.stringify(g.rows[0]));
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
