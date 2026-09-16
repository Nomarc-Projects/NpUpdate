import type { Pool, PoolClient, QueryResult } from "pg";

/* ── Transient DB connection errors: retry + backoff ───────────────────
 * CockroachDB Cloud resolves through a proxy hostname that has occasionally
 * thrown `getaddrinfo EAI_AGAIN` (DNS blips) plus the usual TCP dropouts
 * (resets, timeouts, "connection terminated"). A single one of those used to
 * take down whichever server-side call happened to be in flight — most
 * visibly the admin overview, which opens with session + stats reads, but the
 * same flake could hit any query. These helpers retry the *connection*, not
 * the transaction: only transient network/DNS failures are retried, real
 * query failures (constraint violations, bad SQL, permission denials) are
 * rethrown untouched.
 */

const TRANSIENT_CODES = new Set([
  "EAI_AGAIN",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ERR_SOCKET_CONNECTION_TIMEOUT",
]);

export function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const code = typeof e.code === "string" ? e.code : "";
  if (TRANSIENT_CODES.has(code)) return true;
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return (
    msg.includes("getaddrinfo") ||
    msg.includes("eai_again") ||
    msg.includes("connection terminated") ||
    msg.includes("connection timeout") ||
    msg.includes("terminating connection") ||
    msg.includes("socket hang up") ||
    msg.includes("read econnreset") ||
    msg.includes("timeout expired")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  /** Label for log lines so a retry can be traced to its pool/caller. */
  label: string;
  attempts?: number;
  /** First backoff in ms; doubles per retry with jitter, capped at maxMs. */
  baseMs?: number;
  maxMs?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseMs = options.baseMs ?? 150;
  const maxMs = options.maxMs ?? 1500;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Non-transient (a real query error) or out of attempts: surface the
      // original error unchanged — never mask a bug with a retry timeout.
      if (i >= attempts - 1 || !isTransientError(err)) throw err;
      const delay = Math.floor(Math.min(maxMs, baseMs * 2 ** i) * (0.75 + Math.random() * 0.5));
      console.warn(`[db] transient error (${options.label}); retrying in ${delay}ms:`, (err as Error)?.message ?? err);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/* ── Patch a pg Pool so every connect/query carries the retry ───────────
 * Overriding the instance methods (rather than wrapping calls at each call
 * site) means Better Auth's adapter, Drizzle, and ad-hoc pool.query() calls
 * all inherit the retry without each layer knowing about it. Callback and
 * lock-based forms are passed through untouched.
 */
export function attachDbRetry(pool: Pool, label: string, attempts = 3): void {
  const origConnect = pool.connect.bind(pool);
  const origQuery = pool.query.bind(pool);

  (pool as unknown as { connect: (...args: unknown[]) => unknown }).connect = (
    maybeCallback?: unknown,
  ) => {
    if (typeof maybeCallback === "function") return origConnect(maybeCallback as never);
    return withRetry(() => origConnect() as Promise<PoolClient>, {
      label: `${label}.connect`,
      attempts,
    });
  };

  (pool as unknown as { query: (...args: unknown[]) => unknown }).query = (
    text: unknown,
    values?: unknown,
    callback?: unknown,
  ) => {
    if (typeof callback === "function") {
      // Match node-postgres' (text, callback) / (text, values, callback) idiom.
      return values === undefined
        ? origQuery(text as never, callback as never)
        : origQuery(text as never, values as never, callback as never);
    }
    // QueryConfig-object form (how Drizzle calls node-postgres) — forward the
    // values array and wrap in the same transient-error retry as string queries,
    // so Drizzle-heavy paths (admin overview, etc.) inherit the DNS/TCP flake
    // protection too.
    if (typeof text !== "string") {
      const run = () =>
        values === undefined
          ? (origQuery(text as never) as Promise<QueryResult>)
          : (origQuery(text as never, values as never) as Promise<QueryResult>);
      return withRetry(run, { label: `${label}.query`, attempts });
    }
    const run = () =>
      values === undefined
        ? (origQuery(text as never) as Promise<QueryResult>)
        : (origQuery(text as never, values as never) as Promise<QueryResult>);
    return withRetry(run, { label: `${label}.query`, attempts });
  };
}