import { normalizeMime } from "./media-types";

/**
 * `MediaRecorder` picks its container from whatever the platform supports.
 * Requesting a hardcoded type is how recording broke on platforms that only
 * offer one container (Firefox → Ogg, Safari → MP4): the constructor throws and
 * the UI can only report a misleading "microphone denied".
 *
 * Probe codec-qualified types first — a UA can support the container with a
 * specific codec while rejecting the bare type — and fall back to the browser's
 * default recording type when nothing matches.
 */
const CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

export function pickAudioRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  return CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * The type to stamp on a finished recording. `recorder.mimeType` is empty on
 * some WebViews; an empty Blob.type then travels to the upload route as
 * `application/octet-stream` and is rejected as an unsupported file type. Keep
 * a concrete audio MIME here even when the UA is unhelpful.
 */
export function recordedAudioType(actual: string | undefined, requested?: string): string {
  return normalizeMime(actual) || normalizeMime(requested) || "audio/webm";
}
