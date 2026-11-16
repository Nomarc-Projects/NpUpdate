/**
 * Create Better Auth's own tables in the local database.
 *
 * `user`, `session`, `account`, `verification` and the plugin tables are owned
 * by Better Auth, not by `drizzle/*.sql` — on the deployed database they were
 * created with the Better Auth CLI. A fresh local cluster therefore needs them
 * before the hand-written migrations run (e.g. 0011 does
 * `UPDATE "user" SET role = …`).
 *
 * Run through `npm run db:migrate`, which calls this only when `"user"` is
 * missing, or directly with `npx tsx scripts/db-auth-init.ts`.
 */
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth";

async function main() {
  // `options` is not in the public type surface, but it is the config object
  // getMigrations expects.
  const config = (auth as unknown as { options: Parameters<typeof getMigrations>[0] }).options;
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(config);

  if (toBeCreated.length === 0 && toBeAdded.length === 0) {
    console.log("  ✓ auth schema already present");
    return;
  }
  for (const table of toBeCreated) console.log(`  + ${table.table}`);
  for (const table of toBeAdded) console.log(`  ~ ${table.table} (+${Object.keys(table.fields).length} field(s))`);
  await runMigrations();
  console.log("  ✓ auth schema created");
}

main().catch((err) => {
  console.error("Auth schema setup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
