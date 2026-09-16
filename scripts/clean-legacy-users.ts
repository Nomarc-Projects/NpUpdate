/**
 * Split the legacy extract into users to import and users to reject.
 * Pure file-in/file-out — touches no database at all.
 *
 * Rejection is SCORED, not a single rule, and every rejected row carries the
 * reasons that condemned it so the list can be audited before anything is
 * imported. The bar is deliberately high: wrongly dropping a real professional
 * is worse than importing a bot, because the bot can be deleted later and the
 * professional is simply gone.
 *
 * The signals come from profiling the real data (scripts/analyze-legacy-users.ts):
 *   - 288 users have a single-token name of 14+ characters
 *   - 148 use gmail dot-abuse (3+ dots in the local part; gmail ignores dots,
 *     so it mints unlimited accounts from one inbox)
 *   - 108 do BOTH
 *   - of the 83 gibberish-named users who have a talent profile, ZERO filled in
 *     a single field — no bio, no occupation, no city
 *   - signups spike to 87% suspicious in 2026-05 and 64% in 2026-03
 *
 * Run: cd frontend && npx tsx scripts/clean-legacy-users.ts
 */
import fs from "node:fs";
import path from "node:path";
import type { LegacyUserRaw } from "./pull-legacy-users";

const DIR = path.join(process.cwd(), "..", "plans", "old_nomarc");
const RAW = path.join(DIR, "legacy-users-raw.json");

/** Score at or above this is rejected. */
const REJECT_AT = 3;

interface Scored extends LegacyUserRaw {
  score: number;
  reasons: string[];
  normalizedEmail: string;
  cleanName: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Domains seen clustered around obvious bot signups in this dataset. */
const SUSPECT_DOMAINS = new Set([
  "lvdskjn.store", "hartific.top", "chameleongroup.co", "letter42.com",
  "mailbox.in.ua", "korper.nl",
]);

/** Disposable/relay providers. Not damning alone — plenty of real people use them. */
const RELAY_DOMAINS = new Set(["duck.com", "mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com", "temp-mail.org"]);

/**
 * Gmail treats dots as insignificant, so `a.b.c@gmail.com` and `abc@gmail.com`
 * are one inbox. Three or more is far past what anyone types by hand.
 */
function gmailDotAbuse(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!domain || !/^(gmail|googlemail)\.com$/.test(domain)) return false;
  return (local.match(/\./g) ?? []).length >= 3;
}

/**
 * Random-string detector. Real names alternate vowels and consonants; generated
 * ones run long consonant clusters and skew low on vowels. Requires a single
 * unspaced token of 14+ chars first, so ordinary mononyms are never touched.
 */
function looksGenerated(name: string): boolean {
  const t = name.trim();
  if (t.includes(" ") || t.includes("@")) return false; // name-is-email handled separately
  const letters = t.toLowerCase().replace(/[^a-z]/g, "");
  const vowels = (letters.match(/[aeiou]/g) ?? []).length;

  // A single token with no vowel at all is not a name in any language written
  // in this alphabet. Catches the short generated handles ("Jtjldk", "Pjkzg")
  // that the length test below lets through. 5 chars is the floor so genuine
  // consonant-only initialisms ("MTN", "PwC") are left alone.
  if (letters.length >= 5 && vowels === 0) return true;

  if (t.length < 14 || letters.length < 12) return false;
  const ratio = vowels / letters.length;
  const longestConsonantRun = Math.max(...(letters.split(/[aeiou]/).map((s) => s.length)), 0);
  // English names sit around 35-45% vowels and rarely exceed 4 consonants in a row.
  return ratio < 0.32 || longestConsonantRun >= 5;
}

/** A profile row exists but every meaningful field is empty. */
function profileEmpty(u: LegacyUserRaw): boolean {
  return !u.about && !u.occupation && !u.city && !u.state && !u.companyName;
}

/** Tidy a name for import: collapse spaces, title-case, derive from email if junk. */
function cleanNameOf(u: LegacyUserRaw): string {
  const raw = (u.fullName ?? "").trim().replace(/\s+/g, " ");
  const local = u.email.split("@")[0] ?? "";
  const looksLikeEmail = raw.includes("@") || raw.toLowerCase() === local.toLowerCase();
  const base = !raw || looksLikeEmail ? local.replace(/[._\-0-9]+/g, " ").trim() : raw;
  return base
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ")
    .trim() || local;
}

/** A name with no Latin letters at all — on a Nigerian construction platform,
 *  in practice this was casino/pharma spam rather than an international user. */
function nonLatinName(name: string): boolean {
  const t = name.trim();
  return t.length > 0 && !/[a-z]/i.test(t);
}

/**
 * Does this read as a person? Two or more alphabetic tokens with a normal
 * vowel rhythm. Used as a veto, not a bonus: a plausible human name means the
 * weak signals below can never combine to reject on their own.
 */
function plausibleHumanName(name: string): boolean {
  const t = name.trim().replace(/\s+/g, " ");
  if (t.includes("@") || /\d/.test(t)) return false;
  const tokens = t.split(" ").filter((w) => /^[a-z'’.-]+$/i.test(w) && w.length >= 2);
  if (tokens.length < 2) return false;
  const letters = t.toLowerCase().replace(/[^a-z]/g, "");
  const vowels = (letters.match(/[aeiou]/g) ?? []).length;
  return letters.length > 0 && vowels / letters.length >= 0.28;
}

/**
 * Rejection needs a PRIMARY signal — something that is itself evidence of a
 * machine, not merely of a sparse profile. The corroborating signals then have
 * to agree. Scored this way because the first pass, which simply added weak
 * signals together, rejected "Adekoya Ibrahim" and "Siwoniku Oluwatobiloba A":
 * real people whose only crime was an empty profile and an email of the form
 * initials-plus-birth-year, which is one of the commonest real formats there is.
 * An empty profile is not evidence of fraud; a generated name is.
 */
function score(u: LegacyUserRaw): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const email = u.email.toLowerCase().trim();
  const domain = email.split("@")[1] ?? "";
  const name = (u.fullName ?? "").trim();

  // ── Hard disqualifiers: sufficient on their own ─────────────────────
  if (!email || !EMAIL_RE.test(email)) { s += REJECT_AT; reasons.push("invalid email"); }
  if (/https?:|www\.|\.com\/|<[a-z]/i.test(name)) { s += REJECT_AT; reasons.push("URL or markup in name"); }
  if (SUSPECT_DOMAINS.has(domain)) { s += REJECT_AT; reasons.push(`bot-cluster domain (${domain})`); }

  // ── Primary signals: evidence of a machine ──────────────────────────
  let primary = false;
  if (looksGenerated(name)) { primary = true; s += 2; reasons.push("name looks machine-generated"); }
  if (nonLatinName(name)) { primary = true; s += 2; reasons.push("name has no Latin characters"); }
  if (gmailDotAbuse(email)) { primary = true; s += 2; reasons.push("gmail dot-abuse (3+ dots)"); }

  // ── Corroboration: only counts once a primary signal has fired ──────
  if (primary) {
    if (RELAY_DOMAINS.has(domain)) { s += 1; reasons.push(`disposable/relay domain (${domain})`); }
    if (u.source === "registered" && u.roles.length > 0 && profileEmpty(u)) {
      s += 1; reasons.push("role granted but profile entirely empty");
    }
    if (!u.phone && !u.occupation && !u.city && u.source === "registered") {
      s += 1; reasons.push("no phone, occupation or location");
    }
  }

  // ── Veto: a real-looking human name outranks circumstantial signals ─
  if (plausibleHumanName(name) && !reasons.some((r) => /invalid email|URL or markup|bot-cluster/.test(r))) {
    if (s > 0 && s < REJECT_AT + 2) {
      reasons.push("KEPT: name reads as a real person");
      s = 0;
    }
  }

  return { score: s, reasons };
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const t = String(v).replace(/\r?\n/g, " ").trim();
  return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function writeCsv(file: string, rows: Scored[], extra: (keyof Scored)[] = []) {
  const cols: (keyof Scored)[] = [
    "email", "cleanName", "fullName", "phone", "dateCreated", "source",
    "roles", "occupation", "city", ...extra,
  ];
  const out = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => csvCell(Array.isArray(r[c]) ? (r[c] as string[]).join("|") : r[c])).join(",")),
  ].join("\n");
  fs.writeFileSync(path.join(DIR, file), out);
}

function main() {
  if (!fs.existsSync(RAW)) {
    console.error(`Missing ${RAW}. Run scripts/pull-legacy-users.ts first.`);
    process.exit(1);
  }
  const raw: LegacyUserRaw[] = JSON.parse(fs.readFileSync(RAW, "utf8"));
  console.log(`Loaded ${raw.length} rows\n`);

  // ── Dedupe by normalized email, keeping the earliest signup ─────────
  // Gmail dots are stripped for COMPARISON only, so dot-variants of one inbox
  // collapse together; the address imported is always the one as typed.
  const byKey = new Map<string, Scored>();
  let merged = 0;

  for (const u of raw) {
    const email = u.email.toLowerCase().trim();
    if (!email) continue;
    const [local, domain] = email.split("@");
    const key = /^(gmail|googlemail)\.com$/.test(domain ?? "")
      ? `${(local ?? "").replace(/\./g, "").split("+")[0]}@gmail.com`
      : email;

    const { score: s, reasons } = score(u);
    const cand: Scored = { ...u, score: s, reasons, normalizedEmail: email, cleanName: cleanNameOf(u) };
    const prev = byKey.get(key);
    if (!prev) { byKey.set(key, cand); continue; }

    merged++;
    // Keep the earliest signup date, but fill blanks from whichever row has data
    // so merging never loses a phone number or an occupation.
    const keep = new Date(cand.dateCreated) < new Date(prev.dateCreated) ? cand : prev;
    const other = keep === cand ? prev : cand;
    keep.phone ||= other.phone;
    keep.occupation ||= other.occupation;
    keep.city ||= other.city;
    keep.about ||= other.about;
    keep.roles = [...new Set([...keep.roles, ...other.roles])];
    keep.score = Math.min(keep.score, other.score); // benefit of the doubt
    byKey.set(key, keep);
  }

  const all = [...byKey.values()];
  const keep = all.filter((u) => u.score < REJECT_AT).sort((a, b) => a.dateCreated.localeCompare(b.dateCreated));
  const reject = all.filter((u) => u.score >= REJECT_AT).sort((a, b) => b.score - a.score);

  writeCsv("legacy-users-clean.csv", keep);
  writeCsv("legacy-rejected.csv", reject, ["score", "reasons"]);
  fs.writeFileSync(path.join(DIR, "legacy-users-clean.json"), JSON.stringify(keep, null, 2));

  // ── Report ──────────────────────────────────────────────────────────
  const reasonTally = new Map<string, number>();
  for (const r of reject) for (const x of r.reasons) {
    const k = x.replace(/\(.*\)/, "").trim();
    reasonTally.set(k, (reasonTally.get(k) ?? 0) + 1);
  }
  const roleTally = new Map<string, number>();
  for (const u of keep) for (const r of u.roles.length ? u.roles : ["(none)"]) roleTally.set(r, (roleTally.get(r) ?? 0) + 1);

  console.log("═".repeat(62));
  console.log(`  ${raw.length} extracted`);
  console.log(`  ${merged} merged as duplicates`);
  console.log(`  ${keep.length} TO IMPORT`);
  console.log(`  ${reject.length} REJECTED (score >= ${REJECT_AT})`);
  console.log("═".repeat(62));
  console.log("\nRejection reasons:");
  for (const [r, n] of [...reasonTally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${r}`);
  console.log("\nRoles among users to import:");
  for (const [r, n] of [...roleTally].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${r}`);
  console.log("\nBorderline — rejected at exactly the threshold (review these closely):");
  for (const u of reject.filter((r) => r.score === REJECT_AT).slice(0, 12)) {
    console.log(`  ${u.email.padEnd(38)} "${u.fullName.slice(0, 24)}"  [${u.reasons.join("; ")}]`);
  }
  console.log(`\nWrote legacy-users-clean.csv and legacy-rejected.csv → ${DIR}`);
  console.log("No database was touched.\n");
}

main();
