/**
 * Minimal .env loader for the plain-node dev scripts (db:start, db:migrate…).
 *
 * Next loads `.env.local` itself for `next dev`, but a bare `node script.js`
 * does not, and Node 18 (still installed on some dev boxes) has no --env-file.
 * Values already present in the environment win, so the scripts can also be
 * driven by `DATABASE_URL=… npm run db:migrate`.
 */
const fs = require("node:fs");
const path = require("node:path");

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip one layer of matching quotes, the way dotenv does.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Load `.env.local`, then `.env` (never overriding what is already set). */
function loadEnvLocal(root = path.resolve(__dirname, "..", "..")) {
  const loaded = [];
  for (const file of [".env.local", ".env"]) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const values = parseEnv(fs.readFileSync(full, "utf8"));
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
    loaded.push(file);
  }
  return loaded;
}

module.exports = { loadEnvLocal, parseEnv };
