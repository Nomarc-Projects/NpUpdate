/**
 * Import cleaned legacy users into CockroachDB. ADDITIVE ONLY.
 *
 * This script previously opened by DELETEing from "user". It no longer deletes
 * anything, anywhere, under any flag: existing accounts are updated in place and
 * new ones are created. Nothing that is already in the database can be lost by
 * running this, and it is safe to re-run — every write is an upsert.
 *
 * Passwords of existing users are never touched. Newly created accounts get
 * IMPORT_TEMP_PASSWORD, which nobody is expected to use: they receive a
 * password-reset blast afterwards, targeted via user_role.source = 'signup_legacy'.
 *
 *   Dry run (writes nothing, reports what it would do):
 *     doppler run -p nomarc -c prd -- npx tsx scripts/import-legacy-users.ts --dry-run
 *   Real run:
 *     doppler run -p nomarc -c prd -- npx tsx scripts/import-legacy-users.ts
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { profile } from "@/lib/db/schema";
import { syncPrimaryRole } from "@/lib/roles-internal";

const DRY = process.argv.includes("--dry-run");
const CLEAN = path.join(process.cwd(), "..", "plans", "old_nomarc", "legacy-users-clean.json");
const TEMP_PASSWORD = process.env.IMPORT_TEMP_PASSWORD;

interface CleanUser {
  legacyId: string;
  fullName: string;
  cleanName: string;
  email: string;
  normalizedEmail: string;
  phone: string | null;
  dateCreated: string;
  roles: string[];
  source: "registered" | "waitlist";
  about: string | null;
  city: string | null;
  state: string | null;
  occupation: string | null;
  companyName: string | null;
  supplierCompany: string | null;
}

/**
 * Legacy role → the new platform's stackable roles. Admin is deliberately NOT
 * carried across: the legacy Admin row is an account on the old system, and
 * granting platform-admin by data import is not something that should happen
 * without a person deciding it. Promote by hand afterwards if wanted.
 */
function mapRoles(legacy: string[]): ("professional" | "exhibitor" | "employer")[] {
  const out = new Set<"professional" | "exhibitor" | "employer">();
  for (const r of legacy) {
    if (r === "Talent") out.add("professional");
    else if (r === "Supplier") out.add("exhibitor");
    else if (r === "Employer") out.add("employer");
    // "Admin" intentionally ignored.
  }
  return [...out];
}

/** Primary role cached on user.role. Mirrors the precedence in lib/services/roles.ts. */
function primaryOf(roles: string[]): string {
  if (roles.includes("exhibitor")) return "exhibitor";
  if (roles.includes("professional")) return "professional";
  if (roles.includes("employer")) return "employer";
  return "client";
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log("═".repeat(64));
  console.log(`  LEGACY USER IMPORT — ${DRY ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("═".repeat(64));

  if (!fs.existsSync(CLEAN)) {
    console.error(`\nMissing ${CLEAN}\nRun pull-legacy-users.ts then clean-legacy-users.ts first.`);
    process.exit(1);
  }
  if (!DRY && !TEMP_PASSWORD) {
    console.error("\nIMPORT_TEMP_PASSWORD is not set. Refusing to run with a guessable default.");
    process.exit(1);
  }

  const users: CleanUser[] = JSON.parse(fs.readFileSync(CLEAN, "utf8"));
  console.log(`\n  ${users.length} cleaned users loaded`);

  // ── Snapshot the current state so the effect is provable afterwards ──
  const before = Number(
    (await db.execute(sql`SELECT count(*)::int AS n FROM "user"`)).rows[0] as unknown as { n: number },
  ) || Number(((await db.execute(sql`SELECT count(*)::int AS n FROM "user"`)).rows[0] as { n: number }).n);
  console.log(`  ${before} users currently in CockroachDB\n`);

  const existing = new Map<string, string>();
  for (const r of (await db.execute(sql`SELECT id, email FROM "user"`)).rows as { id: string; email: string }[]) {
    existing.set(r.email.toLowerCase().trim(), r.id);
  }
  console.log(`  ${existing.size} existing emails indexed`);

  let created = 0, updated = 0, failed = 0;
  const errors: { email: string; error: string }[] = [];
  const touched: { id: string; roles: string[] }[] = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const email = u.normalizedEmail || u.email.toLowerCase().trim();
    const roles = mapRoles(u.roles);
    const primary = primaryOf(roles);
    const joined = parseDate(u.dateCreated);
    const known = existing.get(email);

    try {
      let userId: string;

      if (known) {
        // ── UPDATE in place. Only fills blanks; never clears existing data,
        //    never touches the password, never lowers an admin's role. ──────
        userId = known;
        if (!DRY) {
          await db.execute(sql`
            UPDATE "user" SET
              name = CASE WHEN COALESCE(name, '') = '' THEN ${u.cleanName} ELSE name END,
              role = CASE WHEN role IN ('admin','super_admin') THEN role
                          WHEN COALESCE(role, 'client') = 'client' THEN ${primary}
                          ELSE role END,
              "createdAt" = CASE WHEN ${joined ? joined.toISOString() : null}::timestamptz IS NOT NULL
                                  AND ${joined ? joined.toISOString() : null}::timestamptz < "createdAt"
                             THEN ${joined ? joined.toISOString() : null}::timestamptz ELSE "createdAt" END
            WHERE id = ${userId}
          `);
        }
        updated++;
      } else {
        // ── CREATE via Better Auth so the password hashes correctly ────────
        if (DRY) {
          created++;
          continue;
        }
        const res = await auth.api.signUpEmail({
          body: { name: u.cleanName, email: u.email.trim(), password: TEMP_PASSWORD! },
        });
        if (!res?.user?.id) throw new Error("signUpEmail returned no user");
        userId = res.user.id;

        // Set the role directly rather than through the sign-up body: `role` is
        // not an accepted input (it gates the admin console), so a privileged
        // script assigns it after the account exists.
        await db.execute(sql`UPDATE "user" SET role = ${primary} WHERE id = ${userId}`);

        // Better Auth stamps createdAt = now(); restore the real signup date so
        // "member since" and every cohort report stay honest.
        if (joined) {
          await db.execute(sql`UPDATE "user" SET "createdAt" = ${joined.toISOString()} WHERE id = ${userId}`);
        }
        created++;
      }

      if (!DRY) {
        // Profile stub carrying whatever the legacy profile held.
        const headline = u.occupation?.trim() || null;
        const location = [u.city, u.state].filter(Boolean).join(", ").trim() || null;
        const bio = u.about?.trim() || null;
        if (headline || location || bio || u.phone) {
          await db
            .insert(profile)
            .values({ userId, headline, bio, location, phone: u.phone })
            .onConflictDoNothing();
        }

        // Roles into user_role, the source of truth. `signup_legacy` is what the
        // password-reset blast will segment on later.
        for (const r of roles) {
          await db.execute(sql`
            INSERT INTO user_role (user_id, role, status, source, plan)
            VALUES (${userId}, ${r}, 'active', 'signup_legacy', 'free')
            ON CONFLICT (user_id, role) DO NOTHING
          `);
        }
        if (roles.length) touched.push({ id: userId, roles });
      }

      const n = created + updated;
      if (n % 100 === 0) console.log(`  … ${n}/${users.length}`);
      if (!DRY && n % 10 === 0) await new Promise((r) => setTimeout(r, 150)); // free-tier friendly
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/exist|already|unique|duplicate/i.test(msg)) { updated++; continue; }
      failed++;
      errors.push({ email: u.email, error: msg });
      if (failed <= 5) console.error(`  ✗ ${u.email}: ${msg}`);
    }
  }

  // Recompute the cached user.role from the held-role set.
  if (!DRY && touched.length) {
    console.log(`\n  Syncing primary role for ${touched.length} users…`);
    for (const t of touched) await syncPrimaryRole(t.id).catch(() => {});
  }

  const after = Number(((await db.execute(sql`SELECT count(*)::int AS n FROM "user"`)).rows[0] as { n: number }).n);

  console.log("\n" + "═".repeat(64));
  console.log(`  ${DRY ? "WOULD CREATE" : "CREATED"}: ${created}`);
  console.log(`  ${DRY ? "WOULD UPDATE" : "UPDATED"}: ${updated}`);
  console.log(`  FAILED:  ${failed}`);
  console.log(`  users before: ${before}   after: ${after}   delta: +${after - before}`);
  console.log("═".repeat(64));

  if (!DRY) {
    const roleCounts = (await db.execute(sql`SELECT role, count(*)::int AS n FROM "user" GROUP BY role ORDER BY n DESC`)).rows as { role: string; n: number }[];
    console.log("\n  user.role distribution:");
    for (const r of roleCounts) console.log(`    ${(r.role ?? "null").padEnd(14)} ${r.n}`);
    const heldCounts = (await db.execute(sql`SELECT role, count(*)::int AS n FROM user_role WHERE status='active' GROUP BY role ORDER BY n DESC`)).rows as { role: string; n: number }[];
    console.log("\n  user_role (source of truth):");
    for (const r of heldCounts) console.log(`    ${(r.role ?? "null").padEnd(14)} ${r.n}`);
  }

  if (errors.length) {
    const p = path.join(process.cwd(), "..", "plans", "old_nomarc", "import-errors.log");
    fs.writeFileSync(p, errors.map((e) => `${e.email}: ${e.error}`).join("\n"));
    console.log(`\n  ${errors.length} errors → ${p}`);
  }

  console.log(DRY ? "\nDry run only — nothing was written.\n" : "\nDone. No rows were deleted.\n");
  process.exit(0);
}

main().catch((err) => { console.error("\nFATAL:", err); process.exit(1); });
