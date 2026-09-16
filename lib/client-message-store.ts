/**
 * Device-local, ENCRYPTED message threads for Saved Profiles.
 *
 * Two different crypto needs, two different tools:
 *  - Passwords elsewhere in the app: bcrypt (one-way hash) via Better Auth.
 *  - These messages must be READABLE again, so they use AES-GCM 256
 *    (Web Crypto), with the key derived from the signed-in account's email
 *    via PBKDF2-SHA256 (150k iterations).
 *
 * This is device-level protection while the app runs without its live
 * database — the plaintext never sits in localStorage. When going live,
 * replace these functions with server actions of the same shapes backed by
 * DATABASE_URL; treat the email-derived key as obfuscation until then, since
 * nothing secret protects it on a shared device.
 */
export type LocalMsg = { id: string; from: "me"; body: string; at: number };

const APP_SALT = "nomarc.saved-msg.v1";
const ITERATIONS = 150_000;
const keyFor = (me: string, peer: string) => `nomarc.saved-msg.enc.v1:${me}:${peer}`;

type StoredRecord = { id: string; from: "me"; at: number; iv: string; ct: string };

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

async function deriveKey(me: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(me), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode(APP_SALT), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Whole thread with one person, oldest first. Undecryptable rows are skipped. */
export async function listLocalMessages(me: string, peer: string): Promise<LocalMsg[]> {
  if (typeof window === "undefined") return [];
  let records: StoredRecord[];
  try { records = JSON.parse(localStorage.getItem(keyFor(me, peer)) ?? "[]") as StoredRecord[]; }
  catch { return []; }
  if (!Array.isArray(records)) return [];
  const key = await deriveKey(me);
  const out: LocalMsg[] = [];
  for (const r of records) {
    try {
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(r.iv) }, key, unb64(r.ct));
      out.push({ id: r.id, from: r.from, at: r.at, body: new TextDecoder().decode(plain) });
    } catch { /* tampered/unreadable row — drop it */ }
  }
  return out;
}

/** Encrypt and append an outgoing message; returns the stored copy. */
export async function sendLocalMessage(me: string, peer: string, body: string): Promise<LocalMsg> {
  const msg: LocalMsg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: "me",
    body,
    at: Date.now(),
  };
  try {
    const key = await deriveKey(me);
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(msg.body));
    const record: StoredRecord = { id: msg.id, from: msg.from, at: msg.at, iv: b64(iv), ct: b64(ct) };
    let thread: StoredRecord[] = [];
    try { thread = JSON.parse(localStorage.getItem(keyFor(me, peer)) ?? "[]"); } catch {}
    localStorage.setItem(keyFor(me, peer), JSON.stringify([...(Array.isArray(thread) ? thread : []), record]));
  } catch { /* storage full/blocked or crypto unavailable — drop silently */ }
  return msg;
}
