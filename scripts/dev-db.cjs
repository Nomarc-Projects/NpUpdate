#!/usr/bin/env node
/**
 * Local development database (Postgres) — no Docker, no root, no live DB.
 *
 *   npm run db:start     # background server on 127.0.0.1:55432
 *   npm run db:stop
 *   npm run db:status
 *   npm run db:migrate   # apply drizzle/*.sql (ledger-tracked)
 *   npm run db:reset     # wipe + recreate + migrate  (asks nothing: destructive)
 *
 * The cluster is a real PostgreSQL server run from the `embedded-postgres`
 * binaries. It listens on loopback only and stores its data in `.localdb/`
 * (gitignored), so it cannot touch the deployed database.
 *
 * Override with LOCAL_DB_PORT / LOCAL_DB_DIR / LOCAL_DB_NAME / LOCAL_DB_USER /
 * LOCAL_DB_PASSWORD. Nothing here reads the production DATABASE_URL: if
 * .env.local defines one, it must point at this loopback port (see
 * `npm run db:url`).
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { loadEnvLocal } = require("./lib/env.cjs");

loadEnvLocal();

const ROOT = path.resolve(__dirname, "..");
const DIR = path.resolve(ROOT, process.env.LOCAL_DB_DIR || ".localdb");
const DATA_DIR = path.join(DIR, "data");
const LOG_FILE = path.join(DIR, "postgres.log");
const PID_FILE = path.join(DIR, "dev-db.pid");

const PORT = Number(process.env.LOCAL_DB_PORT || 55432);
const USER = process.env.LOCAL_DB_USER || "postgres";
const PASSWORD = process.env.LOCAL_DB_PASSWORD || "postgres";
const DATABASE = process.env.LOCAL_DB_NAME || "nomarc";

const url = `postgres://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}`;

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function portOpen(port, timeout = 400) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function waitForPort(port, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await portOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function tailLog(lines = 15) {
  try {
    return fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log yet)";
  }
}

async function loadEmbeddedPostgres() {
  // ESM-only package; this file is CommonJS so the CLI works on any Node.
  const mod = await import("embedded-postgres");
  return mod.default;
}

async function start() {
  fs.mkdirSync(DIR, { recursive: true });
  const EmbeddedPostgres = await loadEmbeddedPostgres();

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: PORT,
    user: USER,
    password: PASSWORD,
    persistent: true,
    autoRehydrateSymlinks: true,
    onLog: (msg) => process.stderr.write(`${msg}\n`),
    onError: (msg) => process.stderr.write(`${msg}\n`),
  });

  // initdb only on a virgin data dir; calling it again on an existing cluster
  // fails by design.
  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase(DATABASE);
    process.stderr.write(`created database "${DATABASE}"\n`);
  } catch (err) {
    // 42P04 = duplicate_database — expected on every start after the first.
    if (!/already exists|42P04/i.test(err instanceof Error ? err.message : String(err))) throw err;
  }

  fs.writeFileSync(PID_FILE, String(process.pid));

  process.on("exit", () => {
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
  });

  return pg;
}

async function startDaemon() {
  if (await portOpen(PORT)) {
    console.log(`Already running on 127.0.0.1:${PORT}`);
    console.log(url);
    return 0;
  }
  fs.mkdirSync(DIR, { recursive: true });
  const out = fs.openSync(LOG_FILE, "a");
  const child = spawn(process.execPath, [__filename, "start", "--foreground"], {
    detached: true,
    stdio: ["ignore", out, out],
    env: process.env,
    cwd: ROOT,
  });
  child.unref();

  if (!(await waitForPort(PORT))) {
    console.error("Postgres did not come up. Last lines of .localdb/postgres.log:\n");
    console.error(tailLog());
    return 1;
  }
  console.log(`Postgres running on 127.0.0.1:${PORT} (pid ${child.pid})`);
  console.log(`DATABASE_URL=${url}`);
  return 0;
}

async function stop() {
  const pid = readPid();
  if (!pid) {
    if (await portOpen(PORT)) {
      console.error(`No pid file, but something is listening on ${PORT}. Stop it yourself.`);
      return 1;
    }
    console.log("Not running.");
    return 0;
  }
  if (!isRunning(pid)) {
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
    console.log("Not running (cleared stale pid file).");
    return 0;
  }
  process.kill(pid, "SIGTERM");
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (!(await portOpen(PORT))) {
      try {
        fs.unlinkSync(PID_FILE);
      } catch {}
      console.log("Stopped.");
      return 0;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.error("Still listening after 20s; sending SIGKILL.");
  try {
    process.kill(pid, "SIGKILL");
  } catch {}
  return 1;
}

async function status() {
  const pid = readPid();
  const open = await portOpen(PORT);
  if (open) {
    console.log(`Running on 127.0.0.1:${PORT}${pid ? ` (pid ${pid})` : ""}`);
    console.log(url);
    return 0;
  }
  console.log("Not running.");
  return 1;
}

function runNode(script, args = []) {
  return spawnSync(process.execPath, [path.join(ROOT, "scripts", script), ...args], {
    stdio: "inherit",
    env: process.env,
    cwd: ROOT,
  });
}

async function reset() {
  const stopped = await stop();
  if (stopped !== 0) return stopped;
  fs.rmSync(DIR, { recursive: true, force: true });
  console.log("Removed .localdb");
  const started = await startDaemon();
  if (started !== 0) return started;
  // Recreate the schema immediately: a wiped cluster is useless until migrated.
  return runNode("db-migrate.cjs").status ?? 1;
}

async function main() {
  const [command = "start", ...flags] = process.argv.slice(2);
  const foreground = flags.includes("--foreground");

  switch (command) {
    case "start":
      if (foreground) {
        const pg = await start();
        console.log(`Postgres listening on 127.0.0.1:${PORT}`);
        console.log(`DATABASE_URL=${url}`);
        const shutdown = async () => {
          await pg.stop().catch(() => {});
          process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
        return 0;
      }
      return startDaemon();
    case "stop":
      return stop();
    case "status":
      return status();
    case "url":
      console.log(url);
      return 0;
    case "reset":
      return reset();
    default:
      console.error(`Unknown command "${command}". Use: start | stop | status | url | reset`);
      return 1;
  }
}

main()
  .then((code) => {
    if (typeof code === "number" && code !== 0) process.exitCode = code;
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
