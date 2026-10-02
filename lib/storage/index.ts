import "server-only";
import * as local from "./local";
import * as r2 from "../r2";

const useLocal = process.env.STORAGE_BACKEND === "local" || !process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT === "local";

export const storageConfigured = useLocal ? true : r2.r2Configured;
export const storagePrivateConfigured = useLocal ? true : r2.r2PrivateConfigured;

export function publicUrl(key: string) {
  if (useLocal) return local.publicUrl(key);
  return r2.publicUrl(key);
}

export async function uploadObject(key: string, body: Buffer | Uint8Array, contentType: string) {
  if (useLocal) return local.uploadObjectLocal(key, body, contentType);
  return r2.uploadObject(key, body, contentType);
}

export async function deleteObject(key: string) {
  if (useLocal) return local.deleteObjectLocal(key);
  return r2.deleteObject(key);
}

export function keyFromUrl(url: string): string | null {
  if (useLocal) return local.keyFromUrlLocal(url);
  return r2.keyFromUrl(url);
}

export async function privateUploadUrl(key: string, contentType: string, expiresIn = 60): Promise<string> {
  if (useLocal) {
    const base = process.env.APP_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const u = new URL("/api/upload/local-private", base);
    u.searchParams.set("key", key);
    u.searchParams.set("contentType", contentType);
    u.searchParams.set("expires", String(expiresIn));
    return u.toString();
  }
  return r2.privateUploadUrl(key, contentType, expiresIn);
}

export async function getPrivateObject(key: string): Promise<Buffer> {
  if (useLocal) return local.getPrivateObjectLocal(key);
  return r2.getPrivateObject(key);
}

export async function deletePrivateObject(key: string) {
  if (useLocal) return local.deletePrivateObjectLocal(key);
  return r2.deletePrivateObject(key);
}

export async function privateDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  if (useLocal) {
    const base = process.env.APP_URL || process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const u = new URL("/api/upload/local-private/download", base);
    u.searchParams.set("key", key);
    u.searchParams.set("expires", String(expiresIn));
    const sig = Buffer.from(`${key}:${expiresIn}:${Date.now().toString().slice(0,8)}`).toString("base64url").slice(0,16);
    u.searchParams.set("sig", sig);
    return u.toString();
  }
  return r2.privateDownloadUrl(key, expiresIn);
}
