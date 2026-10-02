const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
const m = {}; env.forEach((l) => { const i = l.indexOf("="); if (i > 0) m[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
const { S3Client, CreateBucketCommand, HeadBucketCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const accountId = m.R2_ACCOUNT_ID, accessKeyId = m.R2_ACCESS_KEY_ID, secretAccessKey = m.R2_SECRET_ACCESS_KEY;
const srcBucket = m.R2_BUCKET_NAME;          // nomarcdb
const dstBucket = "nomarcdb-private";
const s3 = new S3Client({
  region: "auto",
  endpoint: m.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: !!m.R2_ENDPOINT,
});

async function bucketExists(name) {
  try { await s3.send(new HeadBucketCommand({ Bucket: name })); return true; }
  catch { return false; }
}

async function main() {
  const exists = await bucketExists(dstBucket);
  console.log(`bucket "${dstBucket}" exists: ${exists}`);
  if (!exists) {
    const mode = process.argv.includes("--create") ? "create" : "would-create";
    console.log(`[${mode}] creating private bucket ${dstBucket}`);
    if (mode === "create") {
      try { await s3.send(new CreateBucketCommand({ Bucket: dstBucket })); console.log("created OK"); }
      catch (e) { console.error("create failed:", e.message); }
    }
  }

  // list helm keys in source bucket
  const keys = [];
  let token;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: srcBucket, ContinuationToken: token }));
    for (const o of r.Contents || []) if (o.Key.startsWith("helm/")) keys.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  console.log(`helm/* keys found in ${srcBucket}: ${keys.length}`);

  if (!process.argv.includes("--create")) { console.log("dry run — pass --create to move (copy to private + delete from public)"); return; }

  let moved = 0;
  for (const k of keys) {
    await s3.send(new CopyObjectCommand({ Bucket: dstBucket, Key: k, CopySource: `${srcBucket}/${k}` }));
    await s3.send(new DeleteObjectCommand({ Bucket: srcBucket, Key: k }));
    moved++;
  }
  console.log(`moved ${moved} helm objects to ${dstBucket} and removed from ${srcBucket}`);
}
main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
