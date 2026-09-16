import { NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { r2Configured, r2PrivateConfigured, publicUrl, privateUploadUrl } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB ceiling for direct uploads
const IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const AUDIO = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];
const DOCS = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip"];
const EXT: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3",
  "application/pdf": "pdf", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
};
const RULES: Record<string, string[]> = {
  // Product galleries take short clips as well as stills. Video is only viable
  // on this presigned path — the /api/upload fallback stays images-only, since a
  // clip won't fit inside a serverless request body.
  avatar: IMAGE, logo: IMAGE, project: IMAGE, product: [...IMAGE, ...VIDEO],
  resume: ["application/pdf"], doc: [...IMAGE, "application/pdf"],
  chat: [...IMAGE, ...VIDEO, ...AUDIO, ...DOCS],
  // Helm documents: contracts, BOQs, spec sheets, drawings, site photos.
  // These go to the PRIVATE bucket and never receive a public URL.
  helm: [...IMAGE, "application/pdf", "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};
/** Kinds whose bytes must never be publicly addressable. */
const PRIVATE_KINDS = new Set(["helm"]);
const slug = () => Math.random().toString(36).slice(2, 10);

export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const { kind = "doc", contentType = "", size = 0 } = await req.json().catch(() => ({}));
  const isPrivate = PRIVATE_KINDS.has(kind);
  if (isPrivate ? !r2PrivateConfigured : !r2Configured) {
    return NextResponse.json({ error: "Uploads are not configured yet." }, { status: 503 });
  }

  const allowed = RULES[kind] ?? RULES.doc;
  if (!allowed.includes(contentType)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (typeof size === "number" && size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });

  // Key is namespaced by user id, so ownership is verifiable from the key alone.
  const key = `${kind}/${uid}/${Date.now()}-${slug()}.${EXT[contentType] ?? "bin"}`;

  if (isPrivate) {
    // No publicUrl — private objects are only ever read via an ownership-checked
    // presigned GET (lib/r2.ts privateDownloadUrl).
    return NextResponse.json({ uploadUrl: await privateUploadUrl(key, contentType), key, private: true });
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key, ContentType: contentType }), { expiresIn: 60 });
  return NextResponse.json({ uploadUrl, publicUrl: publicUrl(key), key });
}
