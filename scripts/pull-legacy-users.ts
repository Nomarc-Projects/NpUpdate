/**
 * Extract every legacy user + the profile data that maps onto the new schema.
 * READ-ONLY: SELECT statements only. The old platform is not modified, and
 * stays the source of truth until the import has been verified.
 *
 * Writes plans/old_nomarc/legacy-users-raw.json (full fidelity, what the
 * cleaner consumes) and legacy-users-raw.csv (for eyeballing in Excel).
 *
 * Binary columns are deliberately NOT pulled: ProfilePicture, IdImage and CAC
 * are varbinary blobs sitting inside the row. Dragging ~1,700 images through
 * this connection would be slow and pointless — nothing imports them yet, and
 * they can be migrated separately to R2 once the accounts exist.
 *
 * Run: cd frontend && npx tsx scripts/pull-legacy-users.ts
 */
import fs from "node:fs";
import path from "node:path";
import { legacyPool, closeLegacy } from "./legacy-db";

const OUT_DIR = path.join(process.cwd(), "..", "plans", "old_nomarc");

export interface LegacyUserRaw {
  legacyId: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateCreated: string;
  emailConfirmed: boolean;
  hasPassword: boolean;
  roles: string[];
  source: "registered" | "waitlist";
  // Talent profile (null when absent)
  about: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  occupation: string | null;
  availability: string | null;
  workArrangement: string | null;
  companyName: string | null;
  profileActive: boolean | null;
  // Supplier profile (null when absent)
  supplierCompany: string | null;
  supplierAddress: string | null;
  supplierIndustry: string | null;
  supplierSize: string | null;
  supplierDescription: string | null;
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r?\n/g, " ").trim();
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const pool = await legacyPool();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Extracting registered users…");
  // LEFT JOINs so a user with no profile still comes through. STRING_AGG folds
  // the role rows into one column so each user is a single record.
  const registered = (
    await pool.request().query(`
      SELECT
        u.Id                AS legacyId,
        u.FullName          AS fullName,
        u.Email             AS email,
        u.PhoneNumber       AS phone,
        u.DateCreated       AS dateCreated,
        u.EmailConfirmed    AS emailConfirmed,
        CASE WHEN u.PasswordHash IS NULL THEN 0 ELSE 1 END AS hasPassword,
        (SELECT STRING_AGG(r.Name, '|') FROM UserMngt.UserRoles ur
           JOIN UserMngt.Roles r ON r.Id = ur.RoleId WHERE ur.UserId = u.Id) AS roles,
        t.About             AS about,
        t.City              AS city,
        t.State             AS state,
        t.Country           AS country,
        t.Occupation        AS occupation,
        t.Availability      AS availability,
        t.WorkArrangement   AS workArrangement,
        t.ComapanyName      AS companyName,
        t.IsActive          AS profileActive,
        s.CompanyName       AS supplierCompany,
        s.CompanyAddress    AS supplierAddress,
        s.Industry          AS supplierIndustry,
        s.CompanySize       AS supplierSize,
        s.CompanyDescription AS supplierDescription
      FROM UserMngt.Users u
      LEFT JOIN UserMngt.TalentProfiles   t ON t.UserId = u.Id
      LEFT JOIN UserMngt.SupplierProfiles s ON s.UserId = u.Id
      ORDER BY u.DateCreated
    `)
  ).recordset;
  console.log(`  ${registered.length} registered`);

  console.log("Extracting waitlist…");
  const waitlist = (
    await pool.request().query(`
      SELECT Id AS legacyId, FirstName, LastName, Email AS email,
             Telephone AS phone, Occupation AS occupation,
             Location AS city, DateCreated AS dateCreated
      FROM UserMngt.WaitlistUser ORDER BY DateCreated
    `)
  ).recordset;
  console.log(`  ${waitlist.length} waitlist`);

  const rows: LegacyUserRaw[] = [];

  for (const r of registered) {
    rows.push({
      legacyId: String(r.legacyId),
      fullName: (r.fullName ?? "").trim(),
      email: (r.email ?? "").trim(),
      phone: r.phone ? String(r.phone).trim() : null,
      dateCreated: r.dateCreated ? new Date(r.dateCreated).toISOString() : "",
      emailConfirmed: !!r.emailConfirmed,
      hasPassword: !!r.hasPassword,
      roles: r.roles ? String(r.roles).split("|").filter(Boolean) : [],
      source: "registered",
      about: r.about ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      country: r.country ?? null,
      occupation: r.occupation ?? null,
      availability: r.availability ?? null,
      workArrangement: r.workArrangement ?? null,
      companyName: r.companyName ?? null,
      profileActive: r.profileActive === null || r.profileActive === undefined ? null : !!r.profileActive,
      supplierCompany: r.supplierCompany ?? null,
      supplierAddress: r.supplierAddress ?? null,
      supplierIndustry: r.supplierIndustry ?? null,
      supplierSize: r.supplierSize ?? null,
      supplierDescription: r.supplierDescription ?? null,
    });
  }

  // Waitlist entries are people who asked to be told when the platform opened.
  // They carry no role, so they land as `client` — the general signed-up state.
  for (const w of waitlist) {
    const name = [w.FirstName, w.LastName].map((s: string) => (s ?? "").trim()).filter(Boolean).join(" ");
    rows.push({
      legacyId: String(w.legacyId),
      fullName: name,
      email: (w.email ?? "").trim(),
      phone: w.phone ? String(w.phone).trim() : null,
      dateCreated: w.dateCreated ? new Date(w.dateCreated).toISOString() : "",
      emailConfirmed: false,
      hasPassword: false,
      roles: [],
      source: "waitlist",
      about: null, city: w.city ?? null, state: null, country: null,
      occupation: w.occupation ?? null, availability: null, workArrangement: null,
      companyName: null, profileActive: null,
      supplierCompany: null, supplierAddress: null, supplierIndustry: null,
      supplierSize: null, supplierDescription: null,
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, "legacy-users-raw.json"), JSON.stringify(rows, null, 2));

  const cols: (keyof LegacyUserRaw)[] = [
    "legacyId", "source", "fullName", "email", "phone", "dateCreated",
    "emailConfirmed", "hasPassword", "roles", "occupation", "city", "state",
    "country", "companyName", "supplierCompany", "profileActive",
  ];
  const csv = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => csvCell(Array.isArray(r[c]) ? (r[c] as string[]).join("|") : r[c])).join(",")),
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "legacy-users-raw.csv"), csv);

  const byRole = new Map<string, number>();
  for (const r of rows) for (const role of r.roles.length ? r.roles : ["(none)"]) byRole.set(role, (byRole.get(role) ?? 0) + 1);

  console.log(`\n  ${rows.length} rows written`);
  console.log("  roles: " + [...byRole].map(([k, v]) => `${k}=${v}`).join("  "));
  console.log(`  → ${path.join(OUT_DIR, "legacy-users-raw.json")}`);
  console.log("\nRead-only. Nothing was written to the legacy database.\n");
}

main()
  .catch((e) => { console.error("FATAL:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(closeLegacy);
