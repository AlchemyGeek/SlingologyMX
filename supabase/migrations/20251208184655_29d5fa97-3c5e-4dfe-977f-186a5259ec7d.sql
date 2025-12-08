-- Add applicability status fields to directives table
ALTER TABLE public.directives 
ADD COLUMN applicability_status TEXT DEFAULT 'Unsure',
ADD COLUMN applicability_reason TEXT;