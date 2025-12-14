-- Remove the public SELECT policy that exposes all access codes
DROP POLICY IF EXISTS "Anyone can read access codes for validation" ON public.access_codes;

-- Remove the public UPDATE policy (counter updates will be done via service role in edge function)
DROP POLICY IF EXISTS "Anyone can update access codes counter" ON public.access_codes;