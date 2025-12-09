-- Remove performer information and cost fields from maintenance_directive_compliance
ALTER TABLE public.maintenance_directive_compliance
DROP COLUMN IF EXISTS performed_by_name,
DROP COLUMN IF EXISTS performed_by_role,
DROP COLUMN IF EXISTS maintenance_provider_name,
DROP COLUMN IF EXISTS labor_hours_actual,
DROP COLUMN IF EXISTS labor_rate,
DROP COLUMN IF EXISTS parts_cost,
DROP COLUMN IF EXISTS total_cost;

-- Remove performer information and cost fields from aircraft_directive_status
ALTER TABLE public.aircraft_directive_status
DROP COLUMN IF EXISTS performed_by_name,
DROP COLUMN IF EXISTS performed_by_role,
DROP COLUMN IF EXISTS maintenance_provider_name,
DROP COLUMN IF EXISTS labor_hours_actual,
DROP COLUMN IF EXISTS labor_rate,
DROP COLUMN IF EXISTS parts_cost,
DROP COLUMN IF EXISTS total_cost;