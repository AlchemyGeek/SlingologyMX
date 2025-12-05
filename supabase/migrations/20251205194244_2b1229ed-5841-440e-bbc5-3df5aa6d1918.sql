-- Add 'Airplane' to maintenance_category enum
ALTER TYPE public.maintenance_category ADD VALUE IF NOT EXISTS 'Airplane' BEFORE 'Airframe';