-- Remove deprecated/unused fields from community_service_bulletins table
ALTER TABLE public.community_service_bulletins DROP COLUMN IF EXISTS equipment_name;
ALTER TABLE public.community_service_bulletins DROP COLUMN IF EXISTS applicability_category;
ALTER TABLE public.community_service_bulletins DROP COLUMN IF EXISTS applicability_model;