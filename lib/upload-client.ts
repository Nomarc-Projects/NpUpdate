"use client";

import { TRANSCODE_MIME, mimeForFileName, needsAacTranscode, normalizeMime } from "./media-types";

export type UploadKind = "avatar" | "logo" | "project" | "product" | "property" | "resume" | "doc" | "chat";
/** Kinds whose bytes must never be publicly addressable. */
export type PrivateUploadKind = "property_doc";

/**
 * The base type to send for a file. Recorded blobs carry codec parameters
 * ("audio/webm;codecs=opus") and, on some WebViews, no type at all; the upload
 * allow-lists match base types, so normalize here and recover a missing type
 * from the filename rather than sending `application/octet-stream`.
 */
function baseContentType(file: File): string {
  const declared = normalizeMime(file.type);
  if (declared && declared !== "application/octet-stream") return declared;
  return mimeForFileName(file.name) || "application/octet-stream";
}

/**
 * Upload a file to R2. Prefers a direct browser→R2 presigned PUT (no size cap,
 * no bandwidth through our function); falls back to the server-side route if the
 * presign/PUT path fails (e.g. CORS not yet propagated).
 *
 * Presign rejections deliberately fall through to the fallback too: the two
 * routes share an allow-list, and the server-side one can recover types the
 * browser omitted. Surfacing the first error would hide the second chance — and
 * used to leak "Unsupported file type" for uploads the fallback would accept.
 */
export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  return (await uploadFileWithKey(file, kind)).url;
}

/**
 * Same upload, but also returns the storage key. Callers that need a
 * post-processing step (voice notes → AAC) need the key, because the presigned
 * path never lets the server see the bytes.
 */
export async function uploadFileWithKey(file: File, kind: UploadKind): Promise<{ url: string; key: string | null }> {
  const contentType = baseContentType(file);
  let presignError: string | null = null;

  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, contentType, size: file.size }),
    });
    if (res.ok) {
      const { uploadUrl, publicUrl, key } = await res.json();
      try {
        // The PUT header must match the type the URL was signed with, or the S3
        // signature check fails.
        const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": contentType }, body: file });
        if (put.ok) return { url: publicUrl as string, key: typeof key === "string" ? key : null };
      } catch { /* CORS/network — use the server-side fallback */ }
    } else if (res.status === 400) {
      // a validation error (type/size) — remember it for the fallback's report
      const data = await res.json().catch(() => ({}));
      presignError = typeof data.error === "string" ? data.error : "Upload not allowed";
    }
  } catch { /* presign unreachable — fall through */ }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((typeof data.error === "string" && data.error) || presignError || "Upload failed");
  }
  const { url, key } = await res.json();
  return { url: url as string, key: typeof key === "string" ? key : null };
}

/**
 * Upload a voice note and return a file that plays everywhere.
 *
 * Chrome/Firefox record WebM or Ogg, which iOS cannot decode at all, so a note
 * sent from Android is silent on an iPhone. The server converts those to
 * AAC/M4A and returns the converted URL; anything already AAC/MP4 (iOS
 * recordings) or any failure keeps the original upload — a note that plays on
 * the sender's device beats a send that fails.
 */
export async function uploadVoiceNote(file: File): Promise<{ url: string; mimeType: string }> {
  const type = baseContentType(file);
  const { url, key } = await uploadFileWithKey(file, "chat");
  if (!key || !needsAacTranscode(type)) return { url, mimeType: type };

  try {
    const res = await fetch("/api/upload/transcode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (typeof data?.url === "string") {
        return { url: data.url, mimeType: typeof data.mimeType === "string" ? data.mimeType : TRANSCODE_MIME };
      }
    }
  } catch { /* conversion unreachable — keep the original */ }

  return { url, mimeType: type };
}


/**
 * Upload a document to the PRIVATE bucket. Returns the storage key, not a URL —
 * callers persist the key and read it later through an ownership-checked
 * presigned GET. There is deliberately no public fallback here: silently
 * sending a title deed to the public bucket would be worse than failing.
 */
export async function uploadPrivateFile(file: File, kind: PrivateUploadKind = "property_doc"): Promise<string> {
  const contentType = baseContentType(file);
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, contentType, size: file.size }),
    });
    if (res.ok) {
      const { uploadUrl, key } = await res.json();
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": contentType }, body: file });
      if (put.ok) return key as string;
    } else if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Upload not allowed");
    }
  } catch (e) {
    if (e instanceof Error && /allowed|not allowed|unsupported|too large|private/i.test(e.message)) throw e;
    // fall through to the server-side private upload
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append("kind", kind);
  const res = await fetch("/api/upload/private", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  const { key } = await res.json();
  return key as string;
}
