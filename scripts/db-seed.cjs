#!/usr/bin/env node
/**
 * Seed the local database with the test accounts and demo rows the app expects.
 *
 *   npm run db:seed                       # accounts + marketplace + quiz
 *   npm run db:seed -- seed-directory     # run one specific script only
 *
 * The scripts under `scripts/` are written as standalone tsx entrypoints that
 * read DATABASE_URL from the environment. Next injects .env.local for `next dev`;
 * a plain `npx tsx` does not, so this wrapper loads it and spawns tsx with the
 * resulting environment.
 *
 * Test accounts (password `Password123!` for all):
 *   pro@nomarc.test · exhibitor@nomarc.test · buyer@nomarc.test
 *   admin@nomarc.test · superadmin@nomarc.test
 */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadEnvLocal } = require("./lib/env.cjs");

loadEnvLocal();

const ROOT = path.resolve(__dirname, "..");
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const DEFAULT_SEEDS = ["seed-auth", "seed-buyer", "seed", "seed-quiz"];

function runSeed(name) {
  const file = path.join(__dirname, `${name}.ts`);
  console.log(`\n▶ ${name}`);
  const result = spawnSync(process.execPath, [TSX_CLI, file], {
    stdio: "inherit",
    env: process.env,
    cwd: ROOT,
  });
  if (result.status !== 0) {
    console.error(`✗ ${name} exited with ${result.status}`);
    return false;
  }
  return true;
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Run `npm run db:start` and `npm run db:migrate` first.");
    process.exit(1);
  }

  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const seeds = requested.length ? requested : DEFAULT_SEEDS;

  for (const name of seeds) {
    if (!runSeed(name)) process.exit(1);
  }
  console.log(`\nDone. Sign in as pro@nomarc.test / Password123!`);
}

main();
