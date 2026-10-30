ALTER TABLE public.aircraft
  ADD COLUMN IF NOT EXISTS link_hobbs_to_tach boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS engine_overhaul_tach numeric,
  ADD COLUMN IF NOT EXISTS engine_overhaul_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engine_overhaul_date date,
  ADD COLUMN IF NOT EXISTS prop_overhaul_tach numeric,
  ADD COLUMN IF NOT EXISTS prop_overhaul_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prop_overhaul_date date;

COMMENT ON COLUMN public.aircraft.airframe_tt_mode IS 'DEPRECATED: Airframe TT is always derived from Tach';
COMMENT ON COLUMN public.aircraft.engine_tt_mode IS 'DEPRECATED: Engine TT is always derived from Tach';
COMMENT ON COLUMN public.aircraft.prop_tt_mode IS 'DEPRECATED: Prop TT is always derived from Tach';