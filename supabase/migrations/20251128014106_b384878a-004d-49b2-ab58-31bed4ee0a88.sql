-- Update attachment_urls to store objects with url and description
-- First, add a temporary column
ALTER TABLE public.maintenance_logs ADD COLUMN attachment_urls_temp jsonb;

-- Convert existing data: array of strings to array of objects
UPDATE public.maintenance_logs
SET attachment_urls_temp = (
  SELECT jsonb_agg(jsonb_build_object('url', elem, 'description', null))
  FROM unnest(attachment_urls) AS elem
)
WHERE attachment_urls IS NOT NULL AND array_length(attachment_urls, 1) > 0;

-- Set empty array for null values
UPDATE public.maintenance_logs
SET attachment_urls_temp = '[]'::jsonb
WHERE attachment_urls IS NULL OR array_length(attachment_urls, 1) IS NULL;

-- Drop old column and rename new one
ALTER TABLE public.maintenance_logs DROP COLUMN attachment_urls;
ALTER TABLE public.maintenance_logs RENAME COLUMN attachment_urls_temp TO attachment_urls;