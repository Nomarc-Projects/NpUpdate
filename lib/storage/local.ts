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

export async function uploadObjectLocal(key: string, body: Buffer | Uint8Array, _contentType: string) {
  await ensureDirs();
  const p = localPathFor(key, false);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
  return publicUrl(key);
}

export async function deleteObjectLocal(key: string) {
  try {
    await fs.unlink(localPathFor(key, false));
  } catch {}
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
