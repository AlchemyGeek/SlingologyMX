-- Grant SELECT on public_profiles view to authenticated users
-- The view already uses security_invoker so it respects the caller's permissions
GRANT SELECT ON public.public_profiles TO authenticated;

-- Revoke access from anon to ensure only authenticated users can access
REVOKE ALL ON public.public_profiles FROM anon;