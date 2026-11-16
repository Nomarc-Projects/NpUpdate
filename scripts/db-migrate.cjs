#!/usr/bin/env node
/**
 * Create the schema in the local database.
 *
 *   npm run db:migrate
 *
 * Why this pushes the drizzle schema instead of replaying `drizzle/*.sql`:
 * the deployed database was built by applying those files by hand over a long
 * period (Memory.md T-012), and it drifted. Fourteen tables that the app uses —
 * `announcement`, `review`, `service`, `blog_post`, the `bt_*` tables, … — exist
 * in `lib/db/schema.ts` but in no migration file, and `0011` already fails on a
 * fresh cluster because it does `UPDATE "announcement"`. `lib/db/schema.ts` is
 * what the code actually queries, so the local database is built from it with
 * `drizzle-kit push`; that is the only definition that is complete.
 *
 * Better Auth owns `user`, `session`, `account` and `verification`; they are
 * added afterwards through Better Auth's own migration API, because they are
 * not in the drizzle schema either.
 *
 * Safety rail: a non-loopback DATABASE_URL is refused. The point of the local
 * database is that nothing here can reach production, and a copy-pasted live
 * connection string is the easiest way to break that promise.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadEnvLocal } = require("./lib/env.cjs");

loadEnvLocal();

const ROOT = path.resolve(__dirname, "..");
const SCHEMA = path.join(ROOT, "lib", "db", "schema.ts");
const DRIZZLE_KIT = path.join(ROOT, "node_modules", "drizzle-kit", "bin.cjs");
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function assertLocal(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    fail(`DATABASE_URL is not a valid URL: ${url.replace(/:\/\/[^@]*@/, "://***@")}`);
  }
  const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"];
  if (!loopback.includes(host) && process.env.ALLOW_REMOTE_MIGRATE !== "1") {
    fail(
      `Refusing to migrate ${host} — this script is for the local database only.\n` +
        "Set ALLOW_REMOTE_MIGRATE=1 to override (you almost certainly do not want that).",
    );
  }
}

async function schemaPresent(pool) {
  // `user_role` is created by the first drizzle migration and is still in the
  // schema, so its absence means this is a fresh cluster.
  const { rows } = await pool.query(`select to_regclass('public."user_role"') as t`);
  return Boolean(rows[0]?.t);
}

/**
 * Create the Better Auth tables if they are missing. They are owned by Better
 * Auth, not by `lib/db/schema.ts`, so the drizzle push above never makes them.
 */
function ensureAuthSchema(pool) {
  return pool.query(`select to_regclass('public."user"') as t`).then(({ rows }) => {
    if (rows[0]?.t) return;
    console.log("\nCreating Better Auth tables (user, session, account, verification)…");
    if (!fs.existsSync(TSX_CLI)) fail("tsx is not installed (needed to create the auth tables). Run `npm install`.");
    const result = spawnSync(process.execPath, [TSX_CLI, path.join(__dirname, "db-auth-init.ts")], {
      stdio: "inherit",
      env: process.env,
      cwd: ROOT,
    });
    if (result.status !== 0) fail("Could not create the Better Auth tables. Fix the error above and re-run.");
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) fail("DATABASE_URL is not set. Run `npm run db:start` first, or add it to .env.local.");
  assertLocal(url);

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: url, max: 1 });

  if (await schemaPresent(pool)) {
    console.log("Schema already present — checking the auth tables only.");
  } else {
    if (!fs.existsSync(DRIZZLE_KIT)) fail("drizzle-kit is not installed. Run `npm install`.");
    console.log(`Applying lib/db/schema.ts to ${new URL(url).host}…`);
    const result = spawnSync(
      process.execPath,
      [DRIZZLE_KIT, "push", "--dialect", "postgresql", "--schema", SCHEMA, "--url", url],
      { stdio: "inherit", env: process.env, cwd: ROOT },
    );
    if (result.status !== 0) {
      fail(
        "drizzle-kit push failed. On a database that already has extra tables (for example a\n" +
          "half-initialised one), drizzle-kit asks an interactive question instead of guessing.\n" +
          "Run `npm run db:reset` to rebuild the local cluster from scratch.",
      );
    }
  }

  await ensureAuthSchema(pool);
  await pool.end();
  console.log("\nLocal schema is ready. Next: `npm run db:seed`.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
