import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { uploadObject, storageConfigured as r2Configured } from "@/lib/storage";
import {
  AUDIO_MIMES, IMAGE_MIMES,
  extensionForMime, isAudioMime, mimeForFileName, normalizeMime,
} from "@/lib/media-types";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (stays under serverless body limit)

const RULES: Record<string, readonly string[]> = {
  avatar: IMAGE_MIMES,
  logo: IMAGE_MIMES,
  project: IMAGE_MIMES,
  product: IMAGE_MIMES,
  // Chat attachments ride the fallback when the presigned path is unavailable.
  // Without this entry chat fell through to RULES.doc, so voice notes (audio)
  // were rejected here even with a clean MIME type.
  chat: [...IMAGE_MIMES, ...AUDIO_MIMES],
  resume: ["application/pdf"],
  doc: [...IMAGE_MIMES, "application/pdf"],
};

const slug = () => Math.random().toString(36).slice(2, 10);

export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;
  if (!r2Configured) return NextResponse.json({ error: "Uploads are not configured yet." }, { status: 503 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid upload" }, { status: 400 }); }

  const file = form.get("file");
  const kind = String(form.get("kind") || "doc");
  const rule = RULES[kind] ?? RULES.doc;

  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  // Same codec-suffix normalization as the presign path ("audio/webm;codecs=opus").
  // If the browser handed us no type at all — which some WebViews do for
  // recordings — recover it from the filename so the voice note isn't rejected
  // as `application/octet-stream`.
  const declared = normalizeMime(file.type);
  const mime = declared && declared !== "application/octet-stream" ? declared : mimeForFileName(file.name);
  const allowedMime = rule.includes(mime) || (kind === "chat" && isAudioMime(mime));
  if (!allowedMime) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });

  const ext = extensionForMime(mime) ?? "bin";
  const key = `${kind}/${uid}/${Date.now()}-${slug()}.${ext}`;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    // Store the normalized type, not file.type: a codec suffix or an empty type
    // would otherwise travel into the object metadata and break playback.
    const url = await uploadObject(key, buf, mime);
    // The key goes back too: the client needs it to ask for an AAC copy (see
    // /api/upload/transcode) without re-deriving it from the URL.
    return NextResponse.json({ url, key });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
