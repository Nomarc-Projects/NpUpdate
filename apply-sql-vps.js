const { Pool } = require('pg');
const fs = require('fs');
async function main() {
  const sql = fs.readFileSync('./drizzle/0003_mature_weapon_omega.sql');
  const p = new Pool({ connectionString: 'postgresql://nomarc:.Adgjmptw14@nomarcproject-nomarcdb-kdg15z:5432/nomarcdb' });
  try {
    await p.query(sql.toString());
    console.log('ok');
  } catch (e) {
    console.error('err', e.message);
  } finally {
    await p.end();
  }
}
main();
