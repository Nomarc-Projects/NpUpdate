-- CockroachDB implements UNIQUE column constraints as unique indexes.
-- Must use DROP INDEX CASCADE (not ALTER TABLE DROP CONSTRAINT) to remove them.
-- PostgreSQL is the opposite: the index backs a real constraint and must be
-- dropped via ALTER TABLE ... DROP CONSTRAINT (which removes the index too).
ALTER TABLE vendor_payment_account DROP CONSTRAINT IF EXISTS vendor_payment_account_company_id_key;
-- Also attempt the Drizzle-style name in case of env difference
ALTER TABLE vendor_payment_account DROP CONSTRAINT IF EXISTS vendor_payment_account_company_id_unique;
-- Ensure composite unique exists (one account_number per company only)
CREATE UNIQUE INDEX IF NOT EXISTS vendor_payment_account_company_acct
  ON vendor_payment_account(company_id, account_number);
