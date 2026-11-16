import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server-user";
import { frozenResponse } from "@/lib/maintenance-gate";
import { getObject, uploadObject, publicUrl } from "@/lib/storage";
import { transcodeToM4a } from "@/lib/audio-transcode";
import { TRANSCODE_EXT, TRANSCODE_MIME, keyNeedsAacTranscode } from "@/lib/media-types";

export const runtime = "nodejs";
/** Conversion of a long note can outlast the default function timeout. */
export const maxDuration = 60;

/**
 * Convert a just-uploaded voice note to AAC/M4A so it plays on iOS.
 *
 * The Go path for uploads is a presigned PUT, so the server never sees the
 * bytes. This is the follow-up call: it reads the object back, converts it, and
 * stores the result beside the original under an `.m4a` key. The original is
 * kept — if a conversion is ever rejected by a browser the raw recording is
 * still there — and the returned URL is the converted one.
 *
 * Only the caller's own `chat/<uid>/…` keys are accepted, so this cannot be
 * used to read or rewrite another user's media.
 */
export async function POST(req: Request) {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await frozenResponse();
  if (frozen) return frozen;

  const { key = "" } = await req.json().catch(() => ({}));
  const parts = String(key).split("/");
  const owned = parts.length === 3 && parts[0] === "chat" && parts[1] === uid && !parts[2].includes("..");
  if (!owned) return NextResponse.json({ error: "Unknown recording" }, { status: 400 });

  const objectKey = parts.join("/");
  if (!keyNeedsAacTranscode(objectKey)) {
    // Already AAC/MP4 (iOS, some Android) or not a container we convert.
    return NextResponse.json({ url: publicUrl(objectKey), key: objectKey, mimeType: TRANSCODE_MIME, transcoded: false });
  }

  let input: Buffer;
  try {
    input = await getObject(objectKey);
  } catch {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const ext = objectKey.split(".").pop() ?? "webm";
  const converted = await transcodeToM4a(input, ext);
  if (!converted) {
    // 503 = "this deployment cannot transcode"; the client keeps the original
    // recording rather than failing the send.
    return NextResponse.json(
      { error: "Audio conversion is unavailable", code: "transcode_unavailable" },
      { status: 503 },
    );
  }

  const m4aKey = objectKey.replace(/\.[^./]+$/, `.${TRANSCODE_EXT}`);
  try {
    const url = await uploadObject(m4aKey, converted, TRANSCODE_MIME);
    return NextResponse.json({ url, key: m4aKey, mimeType: TRANSCODE_MIME, transcoded: true });
  } catch {
    return NextResponse.json({ error: "Could not store converted audio" }, { status: 500 });
  }
}
