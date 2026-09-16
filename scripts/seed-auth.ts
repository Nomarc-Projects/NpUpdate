/**
 * Seeds dummy users via Better Auth so passwords hash correctly.
 * Run: doppler run -p nomarc -c dev -- npx tsx scripts/seed-auth.ts
 * Credentials are written to ../plans/test-users.md for repeated testing.
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { auth } from "../lib/auth";
import { db } from "../lib/db/client";

type Seed = { name: string; email: string; password: string; role: string };

const users: Seed[] = [
  { name: "Ada Okeke",          email: "pro@nomarc.test",        password: "Password123!", role: "professional" },
  { name: "BuildMart Supplies", email: "exhibitor@nomarc.test",  password: "Password123!", role: "exhibitor" },
  { name: "Tunde Bello",        email: "admin@nomarc.test",      password: "Password123!", role: "admin" },
  // super_admin can only otherwise be granted by scripts/make-super-admin.cjs;
  // nothing reachable over HTTP can set it (setUserRole refuses it outright).
  // A seed script already holds database credentials, so it is an accepted path.
  { name: "Nomarc Super Admin", email: "superadmin@nomarc.test", password: "Password123!", role: "super_admin" },
];

async function main() {
  for (const u of users) {
    try {
      const created = await auth.api.signUpEmail({
        body: { name: u.name, email: u.email, password: u.password },
      });
      // `role` is not an accepted sign-up input — it gates the admin console, so
      // accepting it from the request body handed anyone an admin account. A
      // privileged seed script sets it directly once the account exists.
      if (created?.user?.id) {
        await db.execute(sql`UPDATE "user" SET role = ${u.role} WHERE id = ${created.user.id}`);
      }
      console.log(`✓ created ${u.role.padEnd(12)} ${u.email}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/exist|already|unique/i.test(msg)) {
        console.log(`• exists  ${u.role.padEnd(12)} ${u.email}`);
      } else {
        console.error(`✗ failed  ${u.email}: ${msg}`);
      }
    }
  }

  const md = `# Nomarc — Test Users (dummy accounts)

These seeded accounts exist in CockroachDB (Better Auth) for local + live testing.
Re-seed with: \`cd frontend && doppler run -p nomarc -c dev -- npx tsx scripts/seed-auth.ts\`

| Role | Email | Password |
|------|-------|----------|
${users.map((u) => `| ${u.role} | \`${u.email}\` | \`${u.password}\` |`).join("\n")}

> All share the password \`Password123!\`. \`role\` drives the dashboard variant
> (professional vs exhibitor) and chrome. Do not use these credentials in prod
> for real data.
`;
  const out = path.join(process.cwd(), "..", "plans", "test-users.md");
  fs.writeFileSync(out, md);
  console.log(`\nWrote credentials → ${out}`);
  process.exit(0);
}

main();
