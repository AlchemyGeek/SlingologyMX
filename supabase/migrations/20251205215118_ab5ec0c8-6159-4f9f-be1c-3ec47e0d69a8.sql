-- Add columns to track record source and user modification
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS maintenance_log_id uuid REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS directive_id uuid REFERENCES public.directives(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_modified boolean NOT NULL DEFAULT false;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notifications_maintenance_log_id ON public.notifications(maintenance_log_id) WHERE maintenance_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_directive_id ON public.notifications(directive_id) WHERE directive_id IS NOT NULL;