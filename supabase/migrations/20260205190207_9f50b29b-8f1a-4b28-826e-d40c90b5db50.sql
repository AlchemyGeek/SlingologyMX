-- Increase admin_comment character limit from 50 to 250
ALTER TABLE public.feature_requests ALTER COLUMN admin_comment TYPE varchar(250);