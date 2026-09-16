-- Collapse the three-role model to two: professional (general user) + exhibitor.
-- Every legacy "buyer" becomes a professional. Buying & hiring are now
-- capabilities of every general user, not a separate account type.
-- Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0011_role_buyer_to_professional.sql

UPDATE "user" SET role = 'professional' WHERE role = 'buyer';

-- Normalise any announcement targeting that referenced the removed audience.
UPDATE "announcement" SET audience = 'all' WHERE audience = 'buyer';
