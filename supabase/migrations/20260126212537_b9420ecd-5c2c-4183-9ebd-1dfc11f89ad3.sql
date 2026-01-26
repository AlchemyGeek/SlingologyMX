-- Drop the old unique constraint that only uses user_id + directive_code
ALTER TABLE public.directives DROP CONSTRAINT IF EXISTS directives_user_directive_code_unique;

-- Create new unique constraint that includes aircraft_id
-- This allows the same directive code on different aircraft for the same user
ALTER TABLE public.directives 
ADD CONSTRAINT directives_user_aircraft_directive_code_unique 
UNIQUE (user_id, aircraft_id, directive_code);