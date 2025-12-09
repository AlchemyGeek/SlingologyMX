-- Make maintenance_log_id nullable in maintenance_directive_compliance table
-- This allows compliance events to be created either:
-- 1. Linked to a maintenance log (from MaintenanceLogForm)
-- 2. Standalone (from DirectiveComplianceForm)

ALTER TABLE public.maintenance_directive_compliance 
ALTER COLUMN maintenance_log_id DROP NOT NULL;