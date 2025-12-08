-- Add counter_type column to directives table
ALTER TABLE public.directives 
ADD COLUMN counter_type text NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.directives.counter_type IS 'Counter type for counter-based directives (Hobbs, Tach, Airframe TT, Engine TT, Prop TT)';