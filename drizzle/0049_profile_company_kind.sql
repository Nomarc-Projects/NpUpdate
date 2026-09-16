--> Apply: doppler run -p nomarc -c prd -- node scripts/apply-migration.cjs drizzle/0049_profile_company_kind.sql

--> "Set up as a company" lets a firm declare whether it operates as a
--> professional practice or a non-professional business ("professional |
--> non_professional"). Kept on the profile so the directory can tag it.

ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "company_kind" text;--> statement-breakpoint