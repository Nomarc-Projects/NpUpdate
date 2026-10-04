const { Pool } = require('pg');
const fs = require('fs');

async function main() {
  const src = new Pool({
    connectionString: 'postgresql://nomarc:OiSkSJ3_qNPWutCrkqqPGg@nomarc-production-32243.j77.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full',
    ssl: { ca: fs.readFileSync('./certs/cockroach-ca.crt').toString() }
  });
  const host = process.env.POSTGRES_HOST || 'nomarcproject-nomarcdb-kdg15z';
  const dst = new Pool({
    connectionString: `postgresql://nomarc:.Adgjmptw14@${host}:5432/nomarcdb`
  });

  const tablesRes = await src.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' 
    ORDER BY table_name
  `);
  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables, using host=${host}`);

  for (let t of tables) {
    try {
      const c = await src.query(`SELECT count(*)::int as c FROM public."${t}"`);
      const cnt = c.rows[0].c;
      if (cnt === 0) {
        console.log(`Skipping empty ${t}`);
        continue;
      }
      console.log(`Copying ${t} (${cnt} rows)...`);
      const data = await src.query(`SELECT * FROM public."${t}"`);
      if (data.rows.length === 0) continue;
      const cols = Object.keys(data.rows[0]);
      const colsStr = cols.map(k => `"${k}"`).join(',');
      const placeholders = cols.map((_, i) => `$${i+1}`).join(',');
      const q = `INSERT INTO public."${t}" (${colsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      for (let row of data.rows) {
        const vals = cols.map(k => row[k]);
        await dst.query(q, vals);
      }
      console.log(`Done ${t}`);
    } catch (e) {
      console.error(`ERROR in ${t}:`, e.message);
    }
  }
  await src.end();
  await dst.end();
  console.log('Migration complete');
}

main().catch(e => {
  console.error('FATAL', e);
  process.exit(1);
});
