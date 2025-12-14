-- Add RLS policy to allow anyone to read access_codes_enabled setting
CREATE POLICY "Anyone can read access_codes_enabled"
ON public.app_settings
FOR SELECT
USING (setting_key = 'access_codes_enabled');