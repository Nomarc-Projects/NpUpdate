const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const checks = [
    ["users", `select count(*) n from "user"`],
    ["profiles", `select count(*) n from profile`],
    ["jobs(not draft)", `select count(*) n from job where draft = false`],
    ["products", `select count(*) n from product`],
    ["applications", `select count(*) n from application where draft = false`],
    ["companies", `select count(*) n from company`],
    ["sales_orders", `select count(*) n from sales_order`],
    ["promotions", `select count(*) n from promotion`],
    ["newSignupsThisMonth", `select count(*) n from "user" where date_trunc('month',"createdAt")=date_trunc('month',now())`],
  ];
  for (const [label, q] of checks) {
    try { const r = await c.query(q); console.log(`OK   ${label}: ${r.rows[0].n}`); }
    catch(e){ console.log(`FAIL ${label}: ${e.message.split('\n')[0]}`); }
  }
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
