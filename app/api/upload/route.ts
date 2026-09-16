import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { uploadObject, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (stays under serverless body limit)

const IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const RULES: Record<string, { mimes: string[]; ext: Record<string, string> }> = {
  avatar: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  logo: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  project: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
  product: { mimes: IMAGE, ext: { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } },
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
  if (!rule.mimes.includes(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 400 });

  const ext = rule.ext[file.type] ?? "bin";
  const key = `${kind}/${uid}/${Date.now()}-${slug()}.${ext}`;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await uploadObject(key, buf, file.type);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
