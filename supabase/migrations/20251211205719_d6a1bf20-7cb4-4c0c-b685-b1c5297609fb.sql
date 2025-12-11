-- Create app_settings table for storing global application settings
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can view settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update settings
CREATE POLICY "Admins can update settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read signup_enabled setting (needed for auth page)
CREATE POLICY "Anyone can read signup_enabled"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (setting_key = 'signup_enabled');

-- Insert default setting for signup (enabled by default)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('signup_enabled', 'true');