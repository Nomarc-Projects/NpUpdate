import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const PRIVATE_UPLOAD_DIR = process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "uploads", "private");
const PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_UPLOADS_URL || process.env.UPLOADS_PUBLIC_URL || "/uploads").replace(/\/$/, "");

export async function ensureDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(PRIVATE_UPLOAD_DIR, { recursive: true });
}

export function publicUrl(key: string) {
  return `${PUBLIC_BASE_URL}/${key.replace(/\\/g, "/")}`;
}

export function localPathFor(key: string, isPrivate = false) {
  const dir = isPrivate ? PRIVATE_UPLOAD_DIR : UPLOAD_DIR;
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  return path.join(dir, safeKey);
}

export async function uploadObjectLocal(key: string, body: Buffer | Uint8Array, contentType: string) {
  await ensureDirs();
  const p = localPathFor(key, false);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  // Remember the real type: the extension can't tell audio/webm from
  // video/webm, and the serving route needs the exact value to play the file
  // under `X-Content-Type-Options: nosniff`.
  if (contentType) await fs.writeFile(`${p}.mime`, contentType, "utf8");
  return publicUrl(key);
}

export async function deleteObjectLocal(key: string) {
  try {
    await fs.unlink(localPathFor(key, false));
  } catch {}
  try {
    await fs.unlink(`${localPathFor(key, false)}.mime`);
  } catch {}
}

/** Absolute path of a public object (null when the key escapes the upload dir). */
export function publicPathFor(key: string) {
  return localPathFor(key, false);
}

/** Read a public object's bytes server-side (e.g. to transcode it). */
export async function getObjectLocal(key: string): Promise<Buffer> {
  return fs.readFile(publicPathFor(key));
}

/** Stored MIME for a public object, when the upload recorded one. */
export async function objectMimeLocal(key: string): Promise<string | null> {
  try {
    const mime = (await fs.readFile(`${localPathFor(key, false)}.mime`, "utf8")).trim();
    return mime || null;
  } catch {
    return null;
  }
}

export function keyFromUrlLocal(url: string): string | null {
  if (!PUBLIC_BASE_URL || !url.startsWith(PUBLIC_BASE_URL + "/")) return null;
  return url.slice(PUBLIC_BASE_URL.length + 1);
}

export async function uploadObjectLocalPrivate(key: string, body: Buffer | Uint8Array) {
  await ensureDirs();
  const p = localPathFor(key, true);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

export async function getPrivateObjectLocal(key: string): Promise<Buffer> {
  await ensureDirs();
  const p = localPathFor(key, true);
  return fs.readFile(p);
}

export async function deletePrivateObjectLocal(key: string) {
  try {
    await fs.unlink(localPathFor(key, true));
  } catch {}
}
