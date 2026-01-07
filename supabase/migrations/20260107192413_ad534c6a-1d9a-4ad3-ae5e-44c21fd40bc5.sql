-- Add links column to reserves table
ALTER TABLE public.reserves
ADD COLUMN links jsonb DEFAULT '[]'::jsonb;