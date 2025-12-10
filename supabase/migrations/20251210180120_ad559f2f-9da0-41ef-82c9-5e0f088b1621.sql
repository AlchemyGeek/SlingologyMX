-- Create membership status enum
CREATE TYPE public.membership_status AS ENUM ('Applied', 'Approved', 'Suspended');

-- Add membership_status column to profiles table with default 'Approved' for existing users
ALTER TABLE public.profiles 
ADD COLUMN membership_status public.membership_status NOT NULL DEFAULT 'Approved';