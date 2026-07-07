
-- 1) Revoke anon SELECT on all public tables (all app data requires auth already)
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;

-- 2) Restrict community_sb_feedback SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view feedback" ON public.community_sb_feedback;
CREATE POLICY "Authenticated users can view feedback"
ON public.community_sb_feedback
FOR SELECT
TO authenticated
USING (true);

-- 3) Add explicit INSERT policy on profiles for the owning user
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
