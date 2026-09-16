-- Typed quote proposals, replacing an untyped reply that was never stored.
--
-- An exhibitor's response was a single free-text box, and respondToQuote wrote
-- only `status` — the text went out as a notification body and was then gone.
-- Nobody could re-read the terms they had been offered, and the buyer's only
-- action was Accept. The redesigned Quote Proposal form asks for quantity,
-- total price, validity, a note and attachments, then supports Edit Terms and
-- Withdraw on the exhibitor side, and Accept / Decline / Request Changes on the
-- buyer's.
--
-- One row per proposal rather than columns on quote_request: re-quoting after a
-- "request changes" is normal, and the history of what was offered matters when
-- an order is disputed. The live proposal is the newest non-withdrawn row.
--
-- `total_price` is stored in kobo (integer), matching payment_transaction's
-- treatment of money — floats do not belong in a price a contract rests on.
--
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0036_quote_proposal.sql

CREATE TABLE IF NOT EXISTS "quote_proposal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "quote_request_id" uuid NOT NULL REFERENCES "quote_request"("id") ON DELETE CASCADE,
  "exhibitor_user_id" text NOT NULL,
  "quantity_quoted" text,
  -- kobo; 1/100 of a naira
  "total_price" bigint,
  "currency" text NOT NULL DEFAULT 'NGN',
  "valid_until" date,
  "note" text,
  "attachments" text[],
  -- sent | withdrawn | accepted | declined | changes_requested
  "status" text NOT NULL DEFAULT 'sent',
  -- Set when the buyer asks for changes, so the exhibitor knows what to revise.
  "buyer_note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "quote_proposal_request_idx"
  ON "quote_proposal" ("quote_request_id", "created_at" DESC);

-- The quote inbox filters on these; 'archived' is new (the board previously
-- only had Received/Sent, with no way to clear a finished thread).
ALTER TABLE "quote_request" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
-- Lets the list show unread state without scanning proposals.
ALTER TABLE "quote_request" ADD COLUMN IF NOT EXISTS "buyer_seen_at" timestamptz;
ALTER TABLE "quote_request" ADD COLUMN IF NOT EXISTS "exhibitor_seen_at" timestamptz;
