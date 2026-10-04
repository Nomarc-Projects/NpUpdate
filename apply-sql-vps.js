const { Pool } = require('pg');
const fs = require('fs');
async function main() {
  const sql = fs.readFileSync('./drizzle/0003_mature_weapon_omega.sql').toString();
  // split by statement-breakpoint or semicolon not inside? simple split on --> statement-breakpoint and also handle
  const parts = sql.split(/-->\s*statement-breakpoint/);
  const p = new Pool({ connectionString: 'postgresql://nomarc:.Adgjmptw14@nomarcproject-nomarcdb-kdg15z:5432/nomarcdb' });
  for (let part of parts) {
    const stmt = part.trim();
    if (!stmt) continue;
    try {
      await p.query(stmt);
    } catch (e) {
      console.error('SKIP:', e.message.substring(0,60));
    }
  }
  console.log('done');
  await p.end();
}
main().catch(e=>{console.error(e);process.exit(1);});
