ALTER TABLE public.equipment ADD COLUMN archived boolean NOT NULL DEFAULT false;
CREATE INDEX idx_equipment_aircraft_archived ON public.equipment (aircraft_id, archived);