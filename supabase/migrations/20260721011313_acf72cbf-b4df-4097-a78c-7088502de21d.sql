
-- Helper: check approved membership
CREATE OR REPLACE FUNCTION public.is_approved_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND membership_status = 'Approved'
  )
$$;

-- Tighten community_service_bulletins reads: only approved members or admins
DROP POLICY IF EXISTS "Anyone can view community SBs" ON public.community_service_bulletins;
CREATE POLICY "Approved members can view community SBs"
ON public.community_service_bulletins
FOR SELECT TO authenticated
USING (
  public.is_approved_member(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR auth.uid() = maintainer_id
);

-- Tighten feature_requests reads: only own requests + admins
DROP POLICY IF EXISTS "Authenticated users can view feature requests" ON public.feature_requests;
CREATE POLICY "Users can view own or admins view all feature requests"
ON public.feature_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Tighten community_sb_feedback reads: only owner, SB maintainer, or admin
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.community_sb_feedback;
CREATE POLICY "Owner maintainer or admin can view feedback"
ON public.community_sb_feedback
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.community_service_bulletins csb
    WHERE csb.id = community_sb_feedback.community_sb_id
      AND csb.maintainer_id = auth.uid()
  )
);

-- Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC and anon,
-- and from authenticated where the function is not meant to be called directly
-- (trigger functions and admin-only jobs).
REVOKE ALL ON FUNCTION public.generate_commitment_transactions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_feature_vote_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role and is_approved_member are used inside RLS policies, so authenticated
-- must retain EXECUTE. Revoke from anon and PUBLIC only.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.is_approved_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_member(uuid) TO authenticated;
