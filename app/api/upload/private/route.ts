import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { storagePrivateConfigured, uploadPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/**
 * Server-side fallback for private property documents. The presigned PUT is the
 * normal path; this exists for browsers/proxies where the bucket CORS preflight
 * fails. Auth + ownership are enforced here, and the object still lands in the
 * private bucket with no public URL.
 */
export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;
  if (!storagePrivateConfigured) {
    return NextResponse.json({ error: "Private storage is not configured yet." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") || "property_doc");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file supplied" }, { status: 400 });
  }
  if (kind !== "property_doc") {
    return NextResponse.json({ error: "Unsupported private upload kind" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  const key = `property_doc/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${EXT[file.type] ?? "bin"}`;
  const body = Buffer.from(await file.arrayBuffer());
  await uploadPrivateObject(key, body, file.type);
  return NextResponse.json({ key });
}
