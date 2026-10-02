const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const u = await c.query(`select email, role from "user" order by email`);
  console.log("now users:", JSON.stringify(u.rows));
  const accounts = await c.query(`select count(*)::int n from account where "providerId"='credential'`);
  console.log("credential accounts:", accounts.rows[0].n);
  const host = await c.query(`select inet_server_addr() as ip, inet_server_port() as port`);
  console.log("server:", JSON.stringify(host.rows[0]));
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
