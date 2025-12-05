-- Add fields for counter-based recurrence tracking in maintenance logs
ALTER TABLE public.maintenance_logs 
ADD COLUMN IF NOT EXISTS recurrence_counter_type text,
ADD COLUMN IF NOT EXISTS recurrence_counter_increment integer;

-- Add comment for clarity
COMMENT ON COLUMN public.maintenance_logs.recurrence_counter_type IS 'Counter type for recurrence: Hobbs, Tach, Airframe TT, Engine TT, Prop TT';
COMMENT ON COLUMN public.maintenance_logs.recurrence_counter_increment IS 'Increment value for counter-based recurrence';

-- Update interval_type enum to use clearer naming (Interval instead of Calendar)
-- Note: We'll keep backward compatibility by treating existing "Calendar" as "Interval"