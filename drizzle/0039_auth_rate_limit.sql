-- Better Auth rate-limit storage.
--
-- Rate limiting was on (it defaults to enabled in production) but backed by
-- in-memory storage, which on Vercel means every serverless instance keeps its
-- own counter — so the real limit was the configured one times however many
-- lambdas happened to be warm. `rateLimit.storage: "database"` in lib/auth.ts
-- makes the limit shared and durable, and needs this table.
--
-- Column names and types must match what Better Auth generates:
-- key (unique string), count (number), lastRequest (bigint epoch millis).
CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id"          TEXT PRIMARY KEY,
  "key"         TEXT NOT NULL UNIQUE,
  "count"       INTEGER NOT NULL DEFAULT 0,
  "lastRequest" BIGINT NOT NULL DEFAULT 0
);

-- Lookups are always by key; the unique constraint already indexes it, but the
-- sweep of stale windows scans on lastRequest.
CREATE INDEX IF NOT EXISTS "rateLimit_last_request_idx" ON "rateLimit" ("lastRequest");

-- Application-side rate limiting (lib/rate-limit.ts), kept separate from Better
-- Auth's table so neither sweeps the other's rows. Guards the public,
-- unauthenticated surfaces — the contact/newsletter lead form and the email
-- availability check — which had no limiting of any kind.
CREATE TABLE IF NOT EXISTS app_rate_limit (
  key               TEXT PRIMARY KEY,
  count             INTEGER NOT NULL DEFAULT 0,
  window_started_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS app_rate_limit_window_idx ON app_rate_limit (window_started_at);
