-- Remove applicability_model column from directives table (local SBs only)
ALTER TABLE public.directives DROP COLUMN IF EXISTS applicability_model;