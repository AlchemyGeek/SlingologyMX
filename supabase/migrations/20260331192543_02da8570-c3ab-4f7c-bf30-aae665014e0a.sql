
-- Fix 1: Restrict feature_votes SELECT to own votes only
DROP POLICY "Authenticated users can view votes" ON public.feature_votes;
CREATE POLICY "Users can view own votes" ON public.feature_votes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: Restrict bug_reports INSERT to authenticated role only
DROP POLICY "Users can create own bug reports" ON public.bug_reports;
CREATE POLICY "Users can create own bug reports" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
