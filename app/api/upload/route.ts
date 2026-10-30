import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { uploadObject, storageConfigured as r2Configured } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (stays under serverless body limit)

const IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AUDIO = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];
const AUDIO_EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3" };
const RULES: Record<string, { mimes: string[]; ext: Record<string, string> }> = {
  avatar: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  logo: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  project: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  product: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  // Chat attachments ride the fallback when the presigned path is unavailable.
  // Without this entry chat fell through to RULES.doc, so voice notes (audio)
  // were rejected here even with a clean MIME type.
  chat: { mimes: [...IMAGE, ...AUDIO], ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", ...AUDIO_EXT } },
  resume: { mimes: ["application/pdf"], ext: { "application/pdf": "pdf" } },
  doc: { mimes: [...IMAGE, "application/pdf"], ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" } },
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
  const mime = file.type.split(";")[0].trim().toLowerCase();
  if (!rule.mimes.includes(mime)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });

  const ext = rule.ext[mime] ?? "bin";
  const key = `${kind}/${uid}/${Date.now()}-${slug()}.${ext}`;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadObject(key, buf, file.type);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
