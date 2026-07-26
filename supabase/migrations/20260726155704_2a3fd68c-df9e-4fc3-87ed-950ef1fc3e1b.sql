
-- 1. Convert all TO public policies to TO authenticated (except app_settings which needs anon read)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND 'public' = ANY(roles)
      AND tablename <> 'app_settings'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. aircraft_counters: allow owners to delete their own
CREATE POLICY "Users can delete own counters"
  ON public.aircraft_counters
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. community_sb_update_notifications: admin oversight
CREATE POLICY "Admins can view all community sb update notifications"
  ON public.community_sb_update_notifications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any community sb update notifications"
  ON public.community_sb_update_notifications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Revoke EXECUTE on SECURITY DEFINER functions that should only run via triggers or cron
REVOKE EXECUTE ON FUNCTION public.update_feature_vote_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_commitment_transactions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
