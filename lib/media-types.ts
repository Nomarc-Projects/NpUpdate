/**
 * One source of truth for upload MIME types, extensions and normalization.
 *
 * Recorded audio is the reason this exists. `MediaRecorder` reports types with
 * codec parameters ("audio/webm;codecs=opus"), and some browsers/WebViews hand
 * back an empty `Blob.type`; comparing either string against an allow-list
 * rejects perfectly valid voice notes as "Unsupported file type". Everything
 * that validates, signs or stores an upload normalizes through here first.
 *
 * Safe to import from both client components and route handlers: no
 * "server-only" marker.
 */

export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const AUDIO_MIMES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
  "audio/flac",
  "audio/opus",
  "audio/3gpp",
] as const;
export const DOC_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

const EXT_FOR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/flac": "flac",
  "audio/opus": "opus",
  "audio/3gpp": "3gp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
};

const MIME_FOR_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "audio/webm",
  mov: "video/quicktime",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
  "3gp": "audio/3gpp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
};

/**
 * Base MIME type: no parameters, trimmed, lower-case.
 * `"audio/webm;codecs=opus"` → `"audio/webm"`; `undefined` → `""`.
 */
export function normalizeMime(raw: unknown): string {
  return String(raw ?? "").split(";")[0].trim().toLowerCase();
}

/** True for any audio container, including ones not listed above. */
export function isAudioMime(raw: unknown): boolean {
  return normalizeMime(raw).startsWith("audio/");
}

/** The one audio container every target browser can play (iOS included). */
export const TRANSCODE_MIME = "audio/mp4";
export const TRANSCODE_EXT = "m4a";

/**
 * Containers that need transcoding before playback on Apple devices.
 *
 * iOS Safari has no WebM or Ogg decoder, so a note recorded on Android/Chrome
 * is silent there even though the file is perfectly valid. AAC in an MP4
 * container plays everywhere, so those recordings are converted server-side.
 * MP4/AAC recordings (iOS, some Android) are already fine and skip the step.
 */
const TRANSCODE_EXTS = new Set(["webm", "ogg", "oga", "opus", "flac"]);

export function needsAacTranscode(raw: unknown): boolean {
  const mime = normalizeMime(raw);
  if (!isAudioMime(mime)) return false;
  const ext = extensionForMime(mime);
  // Known container: convert only the ones Apple devices cannot decode.
  if (ext) return TRANSCODE_EXTS.has(ext);
  // Unknown-but-audio container (e.g. `audio/x-something`): convert unless it
  // is already MP4/AAC, which is what every Apple device plays natively.
  return mime !== TRANSCODE_MIME && !mime.includes("mp4");
}

/** True when a storage key names a container that needs transcoding. */
export function keyNeedsAacTranscode(key: string): boolean {
  const ext = String(key ?? "").split(".").pop()?.trim().toLowerCase() ?? "";
  return TRANSCODE_EXTS.has(ext);
}

/** Extension (without the dot) for a normalized MIME type, or null if unknown. */
export function extensionForMime(raw: unknown): string | null {
  return EXT_FOR_MIME[normalizeMime(raw)] ?? null;
}

/**
 * Best-effort MIME from a filename extension. Used only when the browser gives
 * us nothing usable — a typeless recorded blob is exactly the case that used to
 * reach the server as `application/octet-stream` and get rejected.
 */
export function mimeForFileName(name: unknown): string {
  const ext = String(name ?? "").split(".").pop()?.trim().toLowerCase() ?? "";
  return ext ? MIME_FOR_EXT[ext] ?? "" : "";
}
