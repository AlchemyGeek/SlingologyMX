-- Restore anon table-level SELECT on app_settings so the sign-in page can read
-- the public signup_enabled / access_codes_enabled toggles before login.
-- RLS policies already restrict anonymous reads to only those two rows.
GRANT SELECT ON public.app_settings TO anon;