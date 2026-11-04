CREATE TABLE public.oil_analysis_samples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 aircraft_id uuid NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
 maintenance_log_id uuid REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,
 sample_date date NOT NULL, report_date date, lab_name text NOT NULL DEFAULT '', lab_number text NOT NULL DEFAULT '', engine_model text NOT NULL DEFAULT '', engine_serial text NOT NULL DEFAULT '',
 hours_on_oil numeric CHECK(hours_on_oil >= 0), hours_on_engine numeric CHECK(hours_on_engine >= 0), makeup_oil numeric CHECK(makeup_oil >= 0), oil_brand_grade text NOT NULL DEFAULT '', fuel_type text NOT NULL DEFAULT '', oil_changed boolean,
 aluminum numeric CHECK(aluminum>=0), chromium numeric CHECK(chromium>=0), iron numeric CHECK(iron>=0), copper numeric CHECK(copper>=0), lead numeric CHECK(lead>=0), tin numeric CHECK(tin>=0), molybdenum numeric CHECK(molybdenum>=0), nickel numeric CHECK(nickel>=0), manganese numeric CHECK(manganese>=0), silver numeric CHECK(silver>=0), titanium numeric CHECK(titanium>=0), potassium numeric CHECK(potassium>=0), boron numeric CHECK(boron>=0), silicon numeric CHECK(silicon>=0), sodium numeric CHECK(sodium>=0), calcium numeric CHECK(calcium>=0), magnesium numeric CHECK(magnesium>=0), phosphorus numeric CHECK(phosphorus>=0), zinc numeric CHECK(zinc>=0), barium numeric CHECK(barium>=0),
 sus_viscosity_210f numeric CHECK(sus_viscosity_210f>=0), cst_viscosity_100c numeric CHECK(cst_viscosity_100c>=0), flashpoint_f numeric, fuel_percent numeric CHECK(fuel_percent BETWEEN 0 AND 100), antifreeze_percent numeric CHECK(antifreeze_percent BETWEEN 0 AND 100), water_percent numeric CHECK(water_percent BETWEEN 0 AND 100), insolubles_percent numeric CHECK(insolubles_percent BETWEEN 0 AND 100), tbn numeric CHECK(tbn>=0), tan numeric CHECK(tan>=0),
 lab_comments text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', universal_averages jsonb NOT NULL DEFAULT '{}', lab_ranges jsonb NOT NULL DEFAULT '{}', qualifiers jsonb NOT NULL DEFAULT '{}', extra_results jsonb NOT NULL DEFAULT '[]', extraction_warnings jsonb NOT NULL DEFAULT '[]', source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','pdf')), reference_profile text NOT NULL DEFAULT 'lab' CHECK(reference_profile IN ('lab','rotax916')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(length(lab_name)<=200 AND length(lab_number)<=200 AND length(engine_model)<=200 AND length(engine_serial)<=200 AND length(lab_comments)<=20000 AND length(notes)<=20000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_analysis_samples TO authenticated;
GRANT ALL ON public.oil_analysis_samples TO service_role;
ALTER TABLE public.oil_analysis_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY oil_samples_owner ON public.oil_analysis_samples AS PERMISSIVE FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.aircraft a WHERE a.id=aircraft_id AND a.user_id=auth.uid()) AND (maintenance_log_id IS NULL OR EXISTS(SELECT 1 FROM public.maintenance_logs m WHERE m.id=maintenance_log_id AND m.aircraft_id=oil_analysis_samples.aircraft_id AND m.user_id=auth.uid())));
CREATE INDEX oil_samples_aircraft_date ON public.oil_analysis_samples(aircraft_id,sample_date DESC);
CREATE UNIQUE INDEX oil_samples_lab_identity ON public.oil_analysis_samples(aircraft_id,lower(lab_name),lower(lab_number),sample_date) WHERE lab_number<>'';
CREATE FUNCTION public.validate_oil_sample_scope() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.aircraft WHERE id=NEW.aircraft_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Aircraft does not belong to sample owner'; END IF;
 IF NEW.maintenance_log_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.maintenance_logs WHERE id=NEW.maintenance_log_id AND aircraft_id=NEW.aircraft_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Maintenance record must belong to the same aircraft'; END IF;
 NEW.updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.validate_oil_sample_scope() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER oil_sample_scope BEFORE INSERT OR UPDATE ON public.oil_analysis_samples FOR EACH ROW EXECUTE FUNCTION public.validate_oil_sample_scope();
CREATE TABLE public.oil_analysis_ai_state(id boolean PRIMARY KEY DEFAULT true CHECK(id), status integer NOT NULL, message text NOT NULL, blocked_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.oil_analysis_ai_state TO service_role;
ALTER TABLE public.oil_analysis_ai_state ENABLE ROW LEVEL SECURITY;