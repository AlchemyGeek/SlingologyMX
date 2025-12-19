-- Allow authenticated users to read limited profile info (for display names in feature requests)
CREATE POLICY "Authenticated users can view display names"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);