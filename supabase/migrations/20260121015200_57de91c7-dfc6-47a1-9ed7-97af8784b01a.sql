-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view community SBs" ON public.community_service_bulletins;

CREATE POLICY "Anyone can view community SBs" 
ON public.community_service_bulletins 
FOR SELECT 
TO authenticated
USING (true);