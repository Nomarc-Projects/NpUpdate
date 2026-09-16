import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
// public base URL (r2.dev or a custom domain), no trailing slash
const publicBase = (process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

/**
 * Private bucket — Helm documents (contracts, BOQs, drawings) and anything else
 * that must never be publicly addressable. Objects here have NO public URL; the
 * only way to read one is a short-lived presigned GET issued after an ownership
 * check (see `privateDownloadUrl`).
 */
const privateBucket = process.env.R2_PRIVATE_BUCKET;

export const r2Configured = !!(accountId && accessKeyId && secretAccessKey && bucket && publicBase);
export const r2PrivateConfigured = !!(accountId && accessKeyId && secretAccessKey && privateBucket);

let _client: S3Client | null = null;
function client() {
  if (!r2Configured) throw new Error("R2 is not configured");
  if (!_client) {
    // R2_ENDPOINT overrides the Cloudflare-hosted endpoint so an S3-compatible
    // server (e.g. MinIO) can back local development. Unset in production.
    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
    _client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: !!process.env.R2_ENDPOINT,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return _client;
}

export function publicUrl(key: string) {
  return `${publicBase}/${key}`;
}

export async function uploadObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  await client().send(new PutObjectCommand({ Bucket: bucket!, Key: key, Body: body, ContentType: contentType }));
  return publicUrl(key);
}

export async function deleteObject(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
}

/** Derive the storage key from a previously returned public URL (for deletes). */
export function keyFromUrl(url: string): string | null {
  if (!publicBase || !url.startsWith(publicBase + "/")) return null;
  return url.slice(publicBase.length + 1);
}

/* ── private bucket (Helm documents) ────────────────────────────────────── */

function privateClient() {
  if (!r2PrivateConfigured) throw new Error("R2 private bucket is not configured");
  return client();
}

/**
 * Short-lived presigned GET for a private object. Callers MUST verify the
 * requesting user owns the object first — this function does no authorization
 * of its own, it only mints the URL.
 */
export async function privateDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(
    privateClient(),
    new GetObjectCommand({ Bucket: privateBucket!, Key: key }),
    { expiresIn },
  );
}

/** Presigned PUT so the browser uploads private bytes straight to R2. */
export async function privateUploadUrl(key: string, contentType: string, expiresIn = 60): Promise<string> {
  return getSignedUrl(
    privateClient(),
    new PutObjectCommand({ Bucket: privateBucket!, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function deletePrivateObject(key: string) {
  await privateClient().send(new DeleteObjectCommand({ Bucket: privateBucket!, Key: key }));
}

/** Read a private object's bytes server-side (for forwarding to the VM to index). */
export async function getPrivateObject(key: string): Promise<Buffer> {
  const res = await privateClient().send(new GetObjectCommand({ Bucket: privateBucket!, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}
