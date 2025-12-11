-- Make bug_reports.user_id nullable to allow anonymous bugs after user deletion
ALTER TABLE public.bug_reports 
  DROP CONSTRAINT IF EXISTS bug_reports_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL;

-- Do the same for feature_requests
ALTER TABLE public.feature_requests
  DROP CONSTRAINT IF EXISTS feature_requests_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL;