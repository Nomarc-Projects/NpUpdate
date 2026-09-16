/**
 * Mirror every remote stock image used in the app into our own Cloudflare R2
 * bucket, then rewrite the source to point at the R2 URLs — so the site serves
 * all imagery from Cloudflare (no third-party hotlinking, better CWV, stable).
 *
 * Idempotent: re-running only uploads IDs not present in the map and rewrites
 * any remaining unsplash references.
 *
 * Run: cd frontend && doppler run -p nomarc -c prd -- npx tsx scripts/mirror-images-to-r2.ts
 * Dry run (no upload, no rewrite): add `--dry`.
 */
import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── R2 client (inlined — lib/r2 imports "server-only" which scripts can't load)
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicBase = (process.env.R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");
const r2Configured = !!(accountId && accessKeyId && secretAccessKey && bucket && publicBase);
const publicUrl = (key: string) => `${publicBase}/${key}`;
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: accessKeyId || "", secretAccessKey: secretAccessKey || "" },
});
async function uploadObject(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: bucket!, Key: key, Body: body, ContentType: contentType }));
  return publicUrl(key);
}

const ROOT = path.join(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib"].map((d) => path.join(ROOT, d));
const DRY = process.argv.includes("--dry");
const UNSPLASH = /https:\/\/images\.unsplash\.com\/(photo-[A-Za-z0-9_-]+)(\?[^"'`\s)]*)?/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(p);
  }
  return out;
}

async function main() {
  if (!DRY && !r2Configured) {
    console.error("R2 is not configured — run under Doppler (prd) so R2_* env is present.");
    process.exit(1);
  }

  const files = SCAN_DIRS.flatMap((d) => (fs.existsSync(d) ? walk(d) : []));
  const ids = new Set<string>();
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(UNSPLASH)) ids.add(m[1]);
  }
  console.log(`Found ${ids.size} distinct stock images across ${files.length} files.\n`);

  // ── Upload each source image to R2 at a stable key: site/<id>.jpg ──────────
  const map = new Map<string, string>(); // id -> R2 public URL
  let uploaded = 0, failed = 0;
  for (const id of ids) {
    const key = `site/${id}.jpg`;
    const target = publicUrl(key);
    map.set(id, target);
    if (DRY) { console.log(`  would upload ${id} -> ${target}`); continue; }
    try {
      const res = await fetch(`https://images.unsplash.com/${id}?w=1600&q=80&fm=jpg`);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await uploadObject(key, buf, "image/jpeg");
      uploaded++;
      if (uploaded % 10 === 0) console.log(`  … ${uploaded}/${ids.size} uploaded`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n  ✓ uploaded ${uploaded}, ✗ failed ${failed}`);

  // ── Rewrite every reference to the R2 URL ─────────────────────────────────
  let filesChanged = 0, refsChanged = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    let changed = 0;
    const next = src.replace(UNSPLASH, (_m, id) => { changed++; return `${publicUrl(`site/${id}.jpg`)}`; });
    if (changed > 0) {
      refsChanged += changed;
      filesChanged++;
      if (!DRY) fs.writeFileSync(f, next);
    }
  }
  console.log(`  ${DRY ? "would rewrite" : "rewrote"} ${refsChanged} references in ${filesChanged} files.`);

  // Persist the map for reference / later curation
  const mapObj = Object.fromEntries(map);
  fs.writeFileSync(path.join(__dirname, "r2-image-map.json"), JSON.stringify(mapObj, null, 2));
  console.log(`\n  Map written → scripts/r2-image-map.json`);
  console.log(`  R2 public base: ${publicUrl("").replace(/\/$/, "")}`);
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
