/**
 * Upload the legacy media folder (data/media) into Cloudflare R2, preserving
 * paths. Layout:
 *   data/media/nomarc/<path>          -> public bucket  (R2_BUCKET_NAME), key=<path>
 *   data/media/nomarc-private/<path>  -> private bucket (R2_PRIVATE_BUCKET), key=<path>
 *
 * R2 keys equal the path relative to nomarc/ and nomarc-private/. For example:
 *   data/media/nomarc/project/U/1.jpg         -> public  bucket key project/U/1.jpg
 *   data/media/nomarc-private/helm/x.dump     -> private bucket key helm/x.dump
 *
 * Idempotent: --replace re-uploads even if an object already exists (default is
 * to skip existing keys). Dry run: add --dry (only reports, no uploads).
 *
 * Run: cd frontend && node scripts/upload-legacy-media.cjs [--dry] [--replace]
 */
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const DRY = process.argv.includes("--dry");
const REPLACE = process.argv.includes("--replace");
const PUBLIC_ONLY = process.argv.includes("--public-only");

const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });

const accountId = m.R2_ACCOUNT_ID;
const accessKeyId = m.R2_ACCESS_KEY_ID;
const secretAccessKey = m.R2_SECRET_ACCESS_KEY;
const pubBucket = m.R2_BUCKET_NAME;
const privBucket = PUBLIC_ONLY ? null : m.R2_PRIVATE_BUCKET;
if (!(accountId && accessKeyId && secretAccessKey && pubBucket && (PUBLIC_ONLY || privBucket))) {
  console.error("Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME / R2_PRIVATE_BUCKET in .env");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: m.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: !!m.R2_ENDPOINT,
});

const MEDIA_ROOT = path.join(__dirname, "..", "..", "data", "media");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function mimeOf(file) {
  const e = path.extname(file).toLowerCase();
  const map = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".txt": "text/plain", ".dump": "application/octet-stream", ".json": "application/json" };
  return map[e] || "application/octet-stream";
}

async function exists(bucket, key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true; }
  catch { return false; }
}

async function main() {
  const tasks = [];
  const pubRoot = path.join(MEDIA_ROOT, "nomarc");
  const privRoot = path.join(MEDIA_ROOT, "nomarc-private");
  for (const f of walk(pubRoot)) tasks.push({ file: f, bucket: pubBucket, key: path.relative(pubRoot, f).split(path.sep).join("/") });
  if (!PUBLIC_ONLY) for (const f of walk(privRoot)) tasks.push({ file: f, bucket: privBucket, key: path.relative(privRoot, f).split(path.sep).join("/") });

  console.log(`${tasks.length} objects to upload (${walk(pubRoot).length} public${PUBLIC_ONLY ? ", private skipped" : ", " + walk(privRoot).length + " private"}).`);
  if (DRY) {
    let pub = 0;
    for (const t of tasks) { if (t.bucket === pubBucket) { console.log(`  would upload public  ${t.key}`); pub++; } else console.log(`  would upload private ${t.key}`); }
    console.log(`\n[dry] ${tasks.length} objects (public ${pub}, private ${tasks.length - pub}).`);
    return;
  }

  let up = 0, skip = 0, fail = 0;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (!REPLACE && (await exists(t.bucket, t.key))) { skip++; continue; }
    try {
      const body = fs.readFileSync(t.file);
      await s3.send(new PutObjectCommand({ Bucket: t.bucket, Key: t.key, Body: body, ContentType: mimeOf(t.file) }));
      up++;
      if (up % 25 === 0) console.log(`  … ${up}/${tasks.length}`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${t.bucket}/${t.key}: ${e.message}`);
    }
  }
  console.log(`\n  ✓ uploaded ${up}, skipped ${skip}, failed ${fail}`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
