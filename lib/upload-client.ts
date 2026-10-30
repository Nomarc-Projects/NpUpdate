"use client";

export type UploadKind = "avatar" | "logo" | "project" | "product" | "property" | "resume" | "doc" | "chat";
/** Kinds whose bytes must never be publicly addressable. */
export type PrivateUploadKind = "property_doc";

/**
 * Upload a file to R2. Prefers a direct browser→R2 presigned PUT (no size cap,
 * no bandwidth through our function); falls back to the server-side route if the
 * presign/PUT path fails (e.g. CORS not yet propagated).
 */
export async function uploadFile(file: File, kind: UploadKind): Promise<string> {
  // Browsers stamp recorded blobs with a codec suffix ("audio/webm;codecs=opus").
  // The upload allow-lists match base MIME types only, so both the presign
  // request and the PUT's Content-Type header must carry the stripped type —
  // a header that differs from the signed one fails the S3 signature check.
  const contentType = (file.type || "application/octet-stream").split(";")[0];
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, contentType, size: file.size }),
    });
    if (res.ok) {
      const { uploadUrl, publicUrl } = await res.json();
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": contentType }, body: file });
      if (put.ok) return publicUrl as string;
    } else if (res.status === 400) {
      // a validation error (type/size) — surface it instead of falling back
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Upload not allowed");
    }
  } catch (e) {
    if (e instanceof Error && /allowed|type|large/i.test(e.message)) throw e;
    // otherwise fall through to server-side upload
  }

  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}


/**
 * Upload a document to the PRIVATE bucket. Returns the storage key, not a URL —
 * callers persist the key and read it later through an ownership-checked
 * presigned GET. There is deliberately no public fallback here: silently
 * sending a title deed to the public bucket would be worse than failing.
 */
export async function uploadPrivateFile(file: File, kind: PrivateUploadKind = "property_doc"): Promise<string> {
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, contentType: file.type, size: file.size }),
    });
    if (res.ok) {
      const { uploadUrl, key } = await res.json();
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (put.ok) return key as string;
    } else if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Upload not allowed");
    }
  } catch (e) {
    if (e instanceof Error && /allowed|type|large|private/i.test(e.message)) throw e;
    // fall through to the server-side private upload
  }

  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const res = await fetch("/api/upload/private", { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Upload failed");
  }
  const { key } = await res.json();
  return key as string;
}
