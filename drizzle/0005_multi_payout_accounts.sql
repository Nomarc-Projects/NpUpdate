-- Allow up to 3 settlement accounts per company (was 1, enforced by unique on company_id)
ALTER TABLE vendor_payment_account DROP CONSTRAINT IF EXISTS vendor_payment_account_company_id_unique;
-- Prevent duplicate account numbers within the same company
CREATE UNIQUE INDEX IF NOT EXISTS vendor_payment_account_company_acct
  ON vendor_payment_account(company_id, account_number);
