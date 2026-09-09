-- 1. Remove anon EXECUTE on internal SECURITY DEFINER helpers (only used in authenticated RLS)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_member(uuid) FROM anon;

-- 2. Prevent maintainers from editing member-owned feedback fields
CREATE OR REPLACE FUNCTION public.enforce_feedback_maintainer_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
    -- Acting as maintainer/admin: only maintainer fields may change
    NEW.id := OLD.id;
    NEW.community_sb_id := OLD.community_sb_id;
    NEW.user_id := OLD.user_id;
    NEW.vote_type := OLD.vote_type;
    NEW.reason := OLD.reason;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_feedback_maintainer_scope ON public.community_sb_feedback;
CREATE TRIGGER enforce_feedback_maintainer_scope
BEFORE UPDATE ON public.community_sb_feedback
FOR EACH ROW EXECUTE FUNCTION public.enforce_feedback_maintainer_scope();

-- 3. Restrict bulletin creation to approved members / admins
DROP POLICY IF EXISTS "Maintainers can create community SBs" ON public.community_service_bulletins;
CREATE POLICY "Approved maintainers can create community SBs"
ON public.community_service_bulletins
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = maintainer_id
  AND (public.is_approved_member(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);