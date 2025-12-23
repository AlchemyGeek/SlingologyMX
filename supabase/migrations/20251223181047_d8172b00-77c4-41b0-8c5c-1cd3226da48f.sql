-- Update existing records from 'Completed' to 'Resolved'
UPDATE public.directives 
SET directive_status = 'Resolved'::directive_status 
WHERE directive_status = 'Completed'::directive_status;