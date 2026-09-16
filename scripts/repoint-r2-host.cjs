const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
const { Client } = require("pg");

const OLD = "https://pub-746d856e5d4c4916a1f61dbd99ff2f33.r2.dev";
const NEW = (m.R2_PUBLIC_DOMAIN || m.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");
if (!NEW) { console.error("new R2 public domain not found in .env"); process.exit(1); }

// table.column pairs from data/README.md
const UPDATES = [
  ["profile", "avatar_url"],
  ["user", "image"],
  ["certification", "url"],
  ["education", "proof_url"],
  ["advert", "avatar_url"],
  ["kyc_document", "file_url"],
  ["message", "attachment_url"],
  ["project", "cover_url"],
  ["blog_post", "cover_url"],
];

async function main() {
  const c = new Client({ connectionString: m.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  console.log(`repoint ${OLD} -> ${NEW}`);
  let total = 0;
  for (const [tbl, col] of UPDATES) {
    // count rows matching old host
    const cnt = (await c.query(`select count(*)::int n from "${tbl}" where "${col}" like '${OLD}%'`)).rows[0].n;
    if (cnt > 0 && !process.argv.includes("--dry")) {
      await c.query(`update "${tbl}" set "${col}" = replace("${col}", '${OLD}', '${NEW}') where "${col}" like '${OLD}%'`);
    }
    console.log(`  ${tbl}.${col}: ${cnt} row(s) ${process.argv.includes("--dry") ? "would update" : "updated"}`);
    total += cnt;
  }
  console.log(`total rows referencing old host: ${total}`);
  await c.end();
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
