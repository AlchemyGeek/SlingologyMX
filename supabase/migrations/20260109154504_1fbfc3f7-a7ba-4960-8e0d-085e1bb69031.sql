-- Remove vendor_name and invoice_number columns from maintenance_logs table
ALTER TABLE public.maintenance_logs DROP COLUMN IF EXISTS vendor_name;
ALTER TABLE public.maintenance_logs DROP COLUMN IF EXISTS invoice_number;