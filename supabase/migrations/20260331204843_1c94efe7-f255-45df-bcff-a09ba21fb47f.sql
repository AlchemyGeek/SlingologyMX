
-- Fix bug_reports DELETE and UPDATE policies to restrict to authenticated users only
DROP POLICY IF EXISTS "Users can delete own bug reports" ON public.bug_reports;
CREATE POLICY "Users can delete own bug reports" ON public.bug_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bug reports" ON public.bug_reports;
CREATE POLICY "Users can update own bug reports" ON public.bug_reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any bug report" ON public.bug_reports;
CREATE POLICY "Admins can delete any bug report" ON public.bug_reports
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update any bug report" ON public.bug_reports;
CREATE POLICY "Admins can update any bug report" ON public.bug_reports
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
