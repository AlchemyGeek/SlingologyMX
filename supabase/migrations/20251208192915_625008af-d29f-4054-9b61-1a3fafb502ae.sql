-- Remove the unique constraint on user_id and directive_id to allow multiple compliance events per directive
ALTER TABLE public.aircraft_directive_status 
DROP CONSTRAINT IF EXISTS aircraft_directive_status_user_id_directive_id_key;