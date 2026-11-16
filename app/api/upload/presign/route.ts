import { NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { storageConfigured as r2Configured, storagePrivateConfigured as r2PrivateConfigured, publicUrl, privateUploadUrl } from "@/lib/storage";
import {
  AUDIO_MIMES, DOC_MIMES, IMAGE_MIMES, VIDEO_MIMES,
  extensionForMime, isAudioMime, normalizeMime,
} from "@/lib/media-types";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB ceiling for direct uploads
const RULES: Record<string, readonly string[]> = {
  // Product galleries take short clips as well as stills. Video is only viable
  // on this presigned path — the /api/upload fallback stays images-only, since a
  // clip won't fit inside a serverless request body.
  avatar: IMAGE_MIMES, logo: IMAGE_MIMES, project: IMAGE_MIMES, product: [...IMAGE_MIMES, ...VIDEO_MIMES],
  property: IMAGE_MIMES,
  resume: ["application/pdf"], doc: [...IMAGE_MIMES, "application/pdf"],
  chat: [...IMAGE_MIMES, ...VIDEO_MIMES, ...AUDIO_MIMES, ...DOC_MIMES],
  // Helm documents: contracts, BOQs, spec sheets, drawings, site photos.
  // These go to the PRIVATE bucket and never receive a public URL.
  helm: [...IMAGE_MIMES, "application/pdf", "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  // Property ownership documents (deeds, C of O, survey plans…). Private
  // bucket only, same as Helm: no public URL is ever minted.
  property_doc: [...IMAGE_MIMES, "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};
/** Kinds whose bytes must never be publicly addressable. */
const PRIVATE_KINDS = new Set(["helm", "property_doc"]);
const slug = () => Math.random().toString(36).slice(2, 10);

export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const { kind = "doc", contentType = "", size = 0 } = await req.json().catch(() => ({}));
  // Recorded blobs arrive as "audio/webm;codecs=opus" etc. — compare and sign
  // the BASE type, or every voice note fails the allow-list check.
  const mime = normalizeMime(contentType);
  const isPrivate = PRIVATE_KINDS.has(kind);
  if (isPrivate ? !r2PrivateConfigured : !r2Configured) {
    return NextResponse.json({ error: "Uploads are not configured yet." }, { status: 503 });
  }

  const allowed = RULES[kind] ?? RULES.doc;
  // Chat accepts any audio container. The explicit AUDIO_MIMES list is the
  // shape we know how to name, but a browser is free to record e.g. audio/aac;
  // rejecting an otherwise valid voice note over an unlisted container is worse
  // than storing it with a generic extension.
  const allowedMime = allowed.includes(mime) || (kind === "chat" && isAudioMime(mime));
  if (!allowedMime) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (typeof size === "number" && size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });

  // Key is namespaced by user id, so ownership is verifiable from the key alone.
  const key = `${kind}/${uid}/${Date.now()}-${slug()}.${extensionForMime(mime) ?? "bin"}`;

  if (isPrivate) {
    // No publicUrl — private objects are only ever read via an ownership-checked
    // presigned GET (lib/r2.ts privateDownloadUrl). Sign the normalized type:
    // signing the raw header while the client sends the base type (or vice
    // versa) fails the S3 signature check.
    return NextResponse.json({ uploadUrl: await privateUploadUrl(key, mime), key, private: true });
  }

  // Use R2_ENDPOINT for MinIO compatibility; falls back to Cloudflare if not set
  const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const forcePathStyle = !!process.env.R2_ENDPOINT; // Required for MinIO
  const s3 = new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key, ContentType: mime }), { expiresIn: 60 });
  return NextResponse.json({ uploadUrl, publicUrl: publicUrl(key), key });
}
