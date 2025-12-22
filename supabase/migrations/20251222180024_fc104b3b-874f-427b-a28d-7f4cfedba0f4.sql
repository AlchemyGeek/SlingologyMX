-- Add equipment_id column to notifications table for linking equipment warranty notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_equipment_id ON public.notifications(equipment_id);