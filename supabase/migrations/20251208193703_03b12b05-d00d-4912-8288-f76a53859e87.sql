-- Add new columns for applicability category and model
ALTER TABLE public.directives 
ADD COLUMN IF NOT EXISTS applicability_category text,
ADD COLUMN IF NOT EXISTS applicability_model text;

-- Migrate existing data: set category based on which filter was populated
UPDATE public.directives
SET applicability_category = CASE
  WHEN engine_model_filter IS NOT NULL AND engine_model_filter != '' THEN 'Engine'
  WHEN prop_model_filter IS NOT NULL AND prop_model_filter != '' THEN 'Propeller'
  WHEN aircraft_make_model_filter IS NOT NULL AND aircraft_make_model_filter != '' THEN 'Airframe'
  ELSE NULL
END,
applicability_model = COALESCE(
  NULLIF(engine_model_filter, ''),
  NULLIF(prop_model_filter, ''),
  NULLIF(aircraft_make_model_filter, '')
);

-- Drop old columns
ALTER TABLE public.directives 
DROP COLUMN IF EXISTS aircraft_make_model_filter,
DROP COLUMN IF EXISTS engine_model_filter,
DROP COLUMN IF EXISTS prop_model_filter;