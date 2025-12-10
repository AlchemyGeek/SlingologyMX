-- Fix feature_requests: require authentication to view
DROP POLICY IF EXISTS "Anyone can view feature requests" ON public.feature_requests;
CREATE POLICY "Authenticated users can view feature requests" 
ON public.feature_requests 
FOR SELECT 
TO authenticated
USING (true);

-- Fix feature_votes: require authentication to view
DROP POLICY IF EXISTS "Anyone can view votes" ON public.feature_votes;
CREATE POLICY "Authenticated users can view votes" 
ON public.feature_votes 
FOR SELECT 
TO authenticated
USING (true);