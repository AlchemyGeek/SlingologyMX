-- Timeline: per-aircraft flying-rate override used for hour-based due projections.
ALTER TABLE public.aircraft
  ADD COLUMN IF NOT EXISTS utilization_hours_per_month numeric;

COMMENT ON COLUMN public.aircraft.utilization_hours_per_month IS
  'Owner override for expected flying hours per month. When null, the timeline uses the trailing six-month average from counter history.';