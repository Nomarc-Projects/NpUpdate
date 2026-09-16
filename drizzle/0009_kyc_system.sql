-- KYC System: tiered verification for professionals, exhibitors, and clients

-- Extend profile with KYC tier and status
ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS kyc_tier    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_status  TEXT    NOT NULL DEFAULT 'none';
-- kyc_status: none | tier1_pending | tier1_approved | tier2_pending | tier2_approved | tier3_pending | tier3_approved | rejected

-- Extend company with KYC tier and status
ALTER TABLE company
  ADD COLUMN IF NOT EXISTS kyc_tier    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_status  TEXT    NOT NULL DEFAULT 'none';

-- KYC document submissions
CREATE TABLE IF NOT EXISTS kyc_document (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT    NOT NULL,
  role         TEXT    NOT NULL, -- professional | exhibitor | buyer
  tier         INTEGER NOT NULL, -- 1 | 2 | 3
  doc_type     TEXT    NOT NULL,
  -- professional tier1: email_verified
  -- professional tier2: reg_certificate | membership_card | reg_number
  -- professional tier3: gov_id_front | gov_id_back | proof_of_address
  -- exhibitor  tier1: email_verified
  -- exhibitor  tier2: cac_certificate | director_id
  -- exhibitor  tier3: proof_of_business_address | industry_certification
  -- buyer      tier1: email_verified
  -- buyer      tier2: phone_nin | proof_of_identity
  -- buyer      tier3: cac_number | director_id
  file_url     TEXT,
  text_value   TEXT,             -- for text submissions (NIN number, reg number, etc.)
  status       TEXT    NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note   TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  TEXT
);

CREATE INDEX IF NOT EXISTS kyc_document_user_idx ON kyc_document(user_id);
CREATE INDEX IF NOT EXISTS kyc_document_status_idx ON kyc_document(status);

-- Paystack settlement accounts for exhibitors
CREATE TABLE IF NOT EXISTS payout_account (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL UNIQUE,
  bank_code           TEXT NOT NULL,
  bank_name           TEXT NOT NULL,
  account_number      TEXT NOT NULL,
  account_name        TEXT NOT NULL,
  paystack_recipient  TEXT,  -- Paystack transfer recipient code
  is_verified         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
