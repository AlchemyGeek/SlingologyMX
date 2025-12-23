-- Fix: Profiles table exposing all columns to authenticated users
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view display names" ON public.profiles;

-- Create a more restrictive policy that only allows viewing display_name and id
-- Users need to see display names for feature requests attribution, etc.
CREATE POLICY "Authenticated users can view public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Actually, we need a different approach - use column-level security via a view
-- First, let's drop the policy we just created
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;

-- Create a secure view that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  display_name
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- The original "Users can view own profile" and "Admins can view all profiles" policies 
-- remain in place, which is correct behavior