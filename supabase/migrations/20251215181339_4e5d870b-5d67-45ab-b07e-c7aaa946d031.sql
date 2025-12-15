-- Add usage counter to access_codes table
ALTER TABLE public.access_codes 
ADD COLUMN use_count integer NOT NULL DEFAULT 0;

-- Add access_code field to profiles table (internal tracking, not visible to users)
ALTER TABLE public.profiles 
ADD COLUMN access_code character varying(5);