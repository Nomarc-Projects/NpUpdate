const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const u = await c.query(`select email, role from "user" order by email`);
  console.log("user rows now:", JSON.stringify(u.rows));
  const a = await c.query(`select u.email, count(a.*)::int as accs from "user" u left join account a on a."userId"=u.id group by u.email order by u.email`);
  console.log("account linkage:", JSON.stringify(a.rows));
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
