/**
 * Reset the password for ALL non-demo users to a single known value.
 *
 * Why: the legacy importer only sets the temp password on users it *creates*.
 * Anyone already present (e.g. imported in an earlier run) keeps their previous
 * password, so "ChangeMe_2026!" won't work for them. Run this once to normalise
 * every imported user to the same temp password, then have them reset via email.
 *
 * Run: cd frontend && RESET_PASSWORD='ChangeMe_2026!' \
 *   doppler run -p nomarc -c prd -- npx tsx scripts/reset-imported-passwords.ts
 */
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

const NEW = process.env.RESET_PASSWORD || "ChangeMe_2026!";

async function main() {
  console.log(`Resetting all non-@nomarc.test credential passwords to: ${NEW}\n`);

  // Better Auth's own hasher, so the stored hash verifies at sign-in.
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(NEW);

  // Discover the real column names (Better Auth uses camelCase quoted columns).
  const cols = (await db.execute(sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'account'
  `)).rows as { column_name: string }[];
  const names = cols.map((c) => c.column_name);
  const providerCol = names.includes("providerId") ? "providerId" : "provider_id";
  const userCol = names.includes("userId") ? "userId" : "user_id";
  console.log(`account columns → provider: "${providerCol}", user: "${userCol}"`);

  const res = await db.execute(sql`
    UPDATE "account" SET "password" = ${hash}
    WHERE ${sql.raw(`"${providerCol}"`)} = 'credential'
      AND ${sql.raw(`"${userCol}"`)} IN (SELECT "id" FROM "user" WHERE email NOT LIKE '%@nomarc.test')
  `);
  console.log(`\n✓ Updated ${res.rowCount ?? "?"} credential accounts.`);
  console.log("Users can now sign in with the temp password, then reset via email.");
  process.exit(0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
