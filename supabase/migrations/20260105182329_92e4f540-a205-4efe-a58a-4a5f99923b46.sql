-- Add currency and timezone columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN currency character varying(10) DEFAULT 'USD',
ADD COLUMN timezone character varying(50) DEFAULT 'America/Los_Angeles';