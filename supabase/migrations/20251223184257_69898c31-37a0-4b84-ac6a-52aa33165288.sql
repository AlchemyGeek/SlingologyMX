-- Fix the SECURITY DEFINER view issue by recreating without it
DROP VIEW IF EXISTS public.public_profiles;

-- Recreate view with SECURITY INVOKER (the default, but being explicit)
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;