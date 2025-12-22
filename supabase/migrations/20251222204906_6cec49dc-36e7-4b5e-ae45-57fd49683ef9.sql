-- Add equipment-related fields to directives table
ALTER TABLE public.directives
ADD COLUMN equipment_id uuid REFERENCES public.equipment(id) ON DELETE SET NULL,
ADD COLUMN equipment_name text,
ADD COLUMN equipment_model text,
ADD COLUMN equipment_serial_number text;

-- Create index for equipment_id for faster lookups
CREATE INDEX idx_directives_equipment_id ON public.directives(equipment_id);