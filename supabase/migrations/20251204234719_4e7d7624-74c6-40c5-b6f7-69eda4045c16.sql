-- Add next_due_basis and next_due_counter_type columns to aircraft_directive_status
ALTER TABLE public.aircraft_directive_status 
ADD COLUMN next_due_basis text CHECK (next_due_basis IN ('Date', 'Counter'));

ALTER TABLE public.aircraft_directive_status 
ADD COLUMN next_due_counter_type text CHECK (next_due_counter_type IN ('Hobbs', 'Tach', 'Airframe TT', 'Engine TT', 'Prop TT'));