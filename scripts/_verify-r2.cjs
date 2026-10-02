const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const accountId = m.R2_ACCOUNT_ID, accessKeyId = m.R2_ACCESS_KEY_ID, secretAccessKey = m.R2_SECRET_ACCESS_KEY;
const pubBucket = m.R2_BUCKET_NAME;
const publicBase = (m.R2_PUBLIC_DOMAIN || m.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");
const s3 = new S3Client({
  region: "auto",
  endpoint: m.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: !!m.R2_ENDPOINT,
});

async function main() {
  // count + sample keys in the public bucket
  let keys = [], token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: pubBucket, ContinuationToken: token }));
    keys.push(...(r.Contents || []).map((o) => o.Key));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  console.log(`bucket "${pubBucket}": ${keys.length} objects total`);
  const sample = keys.filter((k) => /^(site|avatar|project|doc|chat|health)\//.test(k)).slice(0, 6);
  console.log("sample legacy keys:");
  sample.forEach((k) => console.log("  " + k));
  // check a known legacy key is present
  const check = keys.find((k) => k === "site/photo-1518709268805-4e9042af9f23.jpg");
  console.log("legacy key site/photo-1518709268805-4e9042af9f23.jpg present:", !!check);
  const helmKeys = keys.filter((k) => k.startsWith("helm/")).sort();
  console.log(`helm/ private backups: ${helmKeys.length} present`);

  // verify public URL reachability via the new public domain
  if (publicBase && check) {
    const url = `${publicBase}/${check}`;
    const res = await fetch(url);
    console.log(`public URL ${url} -> HTTP ${res.status} (${res.headers.get("content-type")})`);
  } else {
    console.log("public URL check skipped (no R2_PUBLIC_DOMAIN or key missing)");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
