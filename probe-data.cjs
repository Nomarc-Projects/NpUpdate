const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const U = await c.query(`select id,email,name,role from "user" where email in ('pro@nomarc.test','exhibitor@nomarc.test','admin@nomarc.test','superadmin@nomarc.test')`);
  const users = U.rows;
  for (const u of users) {
    console.log(`\n==== ${u.email} (${u.role}) id=${u.id.substring(0,8)} ====`);
    for (const [tbl, col] of [["profile","userId"],["work_experience","userId"],["education","userId"],["profile_skill","userId"],["certification","userId"],["project","userId"]]) {
      try { const r = await c.query(`select count(*)::int as n from ${tbl} where ${col}=$1`,[u.id]); console.log(`  ${tbl}: ${r.rows[0].n}`); }
      catch(e){ console.log(`  ${tbl}: ERR ${e.message}`); }
    }
    if (u.role==='exhibitor') {
      const co = await c.query(`select id,name from company where owner_user_id=$1`,[u.id]);
      for (const x of co.rows) {
        const pp = await c.query(`select count(*)::int as n from product where company_id=$1`,[x.id]);
        const od = await c.query(`select count(*)::int as n from sales_order where vendor_company_id=$1`,[x.id]);
        console.log(`  company ${x.name}: products=${pp.rows[0].n} orders=${od.rows[0].n}`);
      }
    }
    if (u.role==='admin'||u.role==='super_admin'||u.role==='professional') {
      const jobs = await c.query(`select count(*)::int as n from job where owner_user_id=$1`,[u.id]);
      console.log(`  jobs owned: ${jobs.rows[0].n}`);
    }
  }
  const gtot = await c.query(`select
    (select count(*)::int from profile) profiles,
    (select count(*)::int from "user") users,
    (select count(*)::int from product) products,
    (select count(*)::int from job) jobs,
    (select count(*)::int from company) companies`);
  console.log("\nGLOBAL TOTALS:", JSON.stringify(gtot.rows[0]));
  await c.end();
})().catch(e=>{console.error("ERR", e.message); process.exit(1);});
