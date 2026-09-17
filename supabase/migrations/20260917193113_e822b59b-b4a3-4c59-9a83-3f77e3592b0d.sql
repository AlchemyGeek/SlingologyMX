ALTER TABLE public.maintenance_logs ADD COLUMN date_started date;
UPDATE public.maintenance_logs SET date_started = date_performed WHERE date_started IS NULL;
ALTER TABLE public.maintenance_logs ALTER COLUMN date_started SET NOT NULL;
ALTER TABLE public.maintenance_logs RENAME COLUMN date_performed TO date_completed;
ALTER TABLE public.maintenance_logs ALTER COLUMN date_completed DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_maintenance_log_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_completed IS NOT NULL AND NEW.date_completed < NEW.date_started THEN
    RAISE EXCEPTION 'Date Completed cannot be earlier than Date Started';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_maintenance_log_dates
BEFORE INSERT OR UPDATE ON public.maintenance_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_maintenance_log_dates();