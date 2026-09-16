import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { attachDbRetry } from "./retry";

/**
 * Drizzle client on the SAME CockroachDB Better Auth uses. SSL/CA resolution
 * mirrors lib/auth.ts (env cert → committed cert → system CAs).
 */
function resolveSSL() {
  const envCert = process.env.COCKROACH_CA_CERT || process.env.COCKROACH_CERT;
  if (envCert && envCert.includes("BEGIN CERTIFICATE")) {
    return { ca: envCert, rejectUnauthorized: true as const };
  }
  try {
    return { ca: fs.readFileSync(path.join(process.cwd(), "certs", "cockroach-ca.crt"), "utf8"), rejectUnauthorized: true as const };
  } catch {
    return { rejectUnauthorized: true as const };
  }
}

const globalForDb = globalThis as unknown as { __nomarcPool?: Pool };
const pool =
  globalForDb.__nomarcPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, ssl: resolveSSL(), max: 5 });
// Retry transient DNS/TCP failures (CockroachDB Cloud's proxy hostname has
// thrown sporadic `EAI_AGAIN`), before the idle-error handler below.
attachDbRetry(pool, "drizzle");
// `pg` emits 'error' on the Pool when an *idle* client dies. Unhandled, that is
// an unhandled 'error' event, which takes the whole process down — and
// CockroachDB drops idle connections aggressively. Log and let the pool retire
// the client; the next query checks out a fresh one.
pool.on("error", (err) => {
  console.error("[db] idle client error — connection retired:", err.message);
});
if (process.env.NODE_ENV !== "production") globalForDb.__nomarcPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
