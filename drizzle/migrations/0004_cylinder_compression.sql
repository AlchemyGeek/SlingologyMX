ALTER TABLE public.aircraft ADD COLUMN cylinder_count smallint NOT NULL DEFAULT 4 CHECK (cylinder_count IN (2,4,6));
ALTER TABLE public.aircraft ADD COLUMN compression_warning_threshold smallint NOT NULL DEFAULT 60 CHECK (compression_warning_threshold BETWEEN 0 AND 80);
ALTER TABLE public.maintenance_logs ADD COLUMN cylinder_compressions jsonb NULL;