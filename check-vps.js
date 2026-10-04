const { Pool } = require('pg');
async function main() {
  const p = new Pool({ connectionString: 'postgresql://nomarc:.Adgjmptw14@nomarcproject-nomarcdb-kdg15z:5432/nomarcdb' });
  const r = await p.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'");
  console.log(r.rows[0]);
  await p.end();
}
main().catch(e=>{console.error(e.message);process.exit(1);});
