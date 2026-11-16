import "server-only";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Server-side audio transcode for voice notes.
 *
 * iOS Safari ships no WebM or Ogg decoder, so a note recorded on Chrome/Android
 * is valid but silent there. The only portable container is AAC in MP4, so
 * recordings are converted once, at upload time, and the converted file is what
 * gets sent.
 *
 * The binary is resolved lazily, in this order:
 *   1. `FFMPEG_PATH` — lets ops point at a system install (e.g. Debian's
 *      `ffmpeg` package) instead of the bundled one.
 *   2. `@ffmpeg-installer/ffmpeg`, which ships a static build with the native
 *      AAC encoder and Opus/Vorbis decoders we need — no OS packages, works in
 *      `node:22-bookworm-slim`.
 *   3. `ffmpeg` on `PATH`.
 *
 * If none is found the caller keeps the original recording: a note that plays
 * on the sender's device is still better than a failed send.
 */

const INPUT_MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT_MS = 90_000;
// 64 kbit/s mono-ish speech is transparent for voice and keeps notes small.
const BITRATE = "64k";

let binaryPromise: Promise<string | null> | null = null;

async function verify(bin: string): Promise<boolean> {
  const probe = spawnSync(bin, ["-version"], { timeout: 5_000 });
  return probe.status === 0;
}

async function resolveBinary(): Promise<string | null> {
  const override = process.env.FFMPEG_PATH?.trim();
  if (override && (await verify(override))) return override;

  try {
    const mod: any = await import("@ffmpeg-installer/ffmpeg");
    const candidate: string | undefined = mod?.path ?? mod?.default?.path;
    if (candidate && (await verify(candidate))) return candidate;
  } catch {
    /* not installed for this platform — fall through to PATH */
  }

  return (await verify("ffmpeg")) ? "ffmpeg" : null;
}

/** Resolved ffmpeg path, or null when transcoding is impossible here. */
export function ffmpegBinary(): Promise<string | null> {
  if (!binaryPromise) binaryPromise = resolveBinary();
  return binaryPromise;
}

export async function transcodeAvailable(): Promise<boolean> {
  return (await ffmpegBinary()) !== null;
}

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 8_000) stderr += chunk.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg timed out"));
    }, TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.trim().slice(0, 400)}`));
    });
  });
}

/**
 * Convert any supported audio buffer to AAC/M4A.
 *
 * Returns null — never throws — when no ffmpeg is available, the input is
 * unusable, or the conversion fails. The caller falls back to the original
 * file; a failed transcode must never fail the send.
 *
 * Work happens in a temp dir rather than through pipes because a seekable
 * output is what lets the MP4 moov atom be written up front (`+faststart`),
 * which is what Safari wants before it will start playback.
 */
export async function transcodeToM4a(input: Buffer, inputExt = "webm"): Promise<Buffer | null> {
  if (!input.length || input.length > INPUT_MAX_BYTES) return null;
  const bin = await ffmpegBinary();
  if (!bin) return null;

  const dir = await mkdtemp(path.join(os.tmpdir(), "nm-audio-"));
  const ext = /^[a-z0-9]{2,5}$/.test(inputExt) ? inputExt : "bin";
  const inputPath = path.join(dir, `in.${ext}`);
  const outputPath = path.join(dir, "out.m4a");

  try {
    await writeFile(inputPath, input);
    await run(bin, [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
      "-i", inputPath,
      "-vn",                    // drop any cover art / video track
      "-c:a", "aac",
      "-b:a", BITRATE,
      "-movflags", "+faststart",
      "-f", "mp4",
      outputPath,
    ]);

    const output = await readFile(outputPath);
    // Sanity check: an MP4 starts with a size field then "ftyp". A zero-byte or
    // mis-typed file would be worse than none, because the bubble would show a
    // player that never starts.
    if (output.length < 64 || output.subarray(4, 8).toString("latin1") !== "ftyp") {
      console.error("[audio-transcode] ffmpeg produced an unusable file");
      return null;
    }
    return output;
  } catch (err) {
    console.error("[audio-transcode] failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
