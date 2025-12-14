-- Add RLS policy to allow anyone to read access codes for validation
CREATE POLICY "Anyone can read access codes for validation"
ON public.access_codes
FOR SELECT
USING (true);

-- Add RLS policy to allow anyone to update access codes counter during signup
CREATE POLICY "Anyone can update access codes counter"
ON public.access_codes
FOR UPDATE
USING (true)
WITH CHECK (true);