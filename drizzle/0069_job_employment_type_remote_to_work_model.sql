-- Move legacy "Remote" employment types onto the work model.
--
-- Find Jobs and the post-job wizard now use one vocabulary (lib/job-options.ts):
-- employment type is Full-time / Part-time / Internship / Contract, while
-- Remote is a work model alongside On-site and Hybrid. Rows still carrying
-- employment_type = 'Remote' would otherwise be untyped and invisible to the
-- Work model filter, so move that value to work_model and clear the old slot.
--
-- Values other than the exact legacy label (including NULL) are left untouched.
-- Idempotent: once employment_type is no longer 'Remote', the UPDATE is a no-op.
-- Apply: doppler run -p nomarc_projects -c prd -- node scripts/apply-migration.cjs drizzle/0069_job_employment_type_remote_to_work_model.sql

UPDATE "job"
SET employment_type = NULL, work_model = 'Remote'
WHERE employment_type = 'Remote';
