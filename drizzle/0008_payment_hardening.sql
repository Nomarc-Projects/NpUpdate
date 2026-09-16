-- Payment hardening: webhook audit log, retry queue, idempotency

CREATE TABLE IF NOT EXISTS webhook_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT,
  reference TEXT,
  raw_body TEXT NOT NULL,
  status TEXT DEFAULT 'processed',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_event_dedup ON webhook_event (provider, event_id);

CREATE TABLE IF NOT EXISTS payment_retry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  attempts INT DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_retry_pending ON payment_retry (next_retry_at) WHERE resolved_at IS NULL;
