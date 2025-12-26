-- =============================================
-- MULTI-AIRCRAFT SUPPORT MIGRATION
-- =============================================

-- 1. Create aircraft table
CREATE TABLE public.aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration VARCHAR(20) NOT NULL,
  model_make VARCHAR(100),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on aircraft
ALTER TABLE public.aircraft ENABLE ROW LEVEL SECURITY;

-- RLS policies for aircraft
CREATE POLICY "Users can view own aircraft" ON public.aircraft
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own aircraft" ON public.aircraft
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own aircraft" ON public.aircraft
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own aircraft" ON public.aircraft
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all aircraft" ON public.aircraft
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any aircraft" ON public.aircraft
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_aircraft_updated_at
  BEFORE UPDATE ON public.aircraft
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 2. Add aircraft_id columns (nullable initially for migration)
ALTER TABLE public.aircraft_counters ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.aircraft_counter_history ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_logs ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.directives ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.aircraft_directive_status ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.equipment ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.directive_history ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_directive_compliance ADD COLUMN aircraft_id UUID REFERENCES public.aircraft(id) ON DELETE CASCADE;

-- 3. Create aircraft from existing profile data
-- Users with registration data
INSERT INTO public.aircraft (user_id, registration, model_make, is_primary)
SELECT 
  id AS user_id,
  plane_registration AS registration,
  plane_model_make AS model_make,
  true AS is_primary
FROM public.profiles
WHERE plane_registration IS NOT NULL AND plane_registration != '';

-- Users without registration (create placeholder to preserve their data)
INSERT INTO public.aircraft (user_id, registration, model_make, is_primary)
SELECT 
  id AS user_id,
  'UNSET' AS registration,
  plane_model_make AS model_make,
  true AS is_primary
FROM public.profiles
WHERE plane_registration IS NULL OR plane_registration = '';

-- 4. Backfill aircraft_id on existing records
UPDATE public.aircraft_counters ac
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = ac.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.aircraft_counter_history ach
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = ach.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.maintenance_logs ml
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = ml.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.directives d
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = d.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.aircraft_directive_status ads
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = ads.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.equipment e
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = e.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.notifications n
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = n.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.directive_history dh
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = dh.user_id AND a.is_primary = true
  LIMIT 1
);

UPDATE public.maintenance_directive_compliance mdc
SET aircraft_id = (
  SELECT a.id FROM public.aircraft a 
  WHERE a.user_id = mdc.user_id AND a.is_primary = true
  LIMIT 1
);

-- 5. Make aircraft_id NOT NULL on all tables
ALTER TABLE public.aircraft_counters ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.aircraft_counter_history ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.maintenance_logs ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.directives ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.aircraft_directive_status ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.equipment ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.directive_history ALTER COLUMN aircraft_id SET NOT NULL;
ALTER TABLE public.maintenance_directive_compliance ALTER COLUMN aircraft_id SET NOT NULL;

-- 6. Update unique constraint on aircraft_counters (was 1:1 with user, now 1:1 with aircraft)
ALTER TABLE public.aircraft_counters DROP CONSTRAINT IF EXISTS aircraft_counters_user_id_key;
ALTER TABLE public.aircraft_counters ADD CONSTRAINT aircraft_counters_aircraft_id_key UNIQUE (aircraft_id);

-- 7. Update handle_new_user trigger to also create an aircraft
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_aircraft_id uuid;
BEGIN
  -- Insert profile with 'Applied' status and capture metadata from signup
  INSERT INTO public.profiles (
    id, 
    email, 
    membership_status,
    name,
    display_name,
    country,
    state_prefecture,
    city,
    plane_registration,
    plane_model_make
  )
  VALUES (
    NEW.id, 
    NEW.email,
    'Applied',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'country',
    NEW.raw_user_meta_data ->> 'state_prefecture',
    NEW.raw_user_meta_data ->> 'city',
    NEW.raw_user_meta_data ->> 'plane_registration',
    NEW.raw_user_meta_data ->> 'plane_model_make'
  );
  
  -- Create the user's first aircraft (required at signup)
  INSERT INTO public.aircraft (
    user_id,
    registration,
    model_make,
    is_primary
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'plane_registration', 'UNSET'),
    NEW.raw_user_meta_data ->> 'plane_model_make',
    true
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- If email is stathis@gmail.com, also add admin role
  IF NEW.email = 'stathis@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;