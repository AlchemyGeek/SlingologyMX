-- Add Software Version and Database Version fields to directives table
ALTER TABLE public.directives 
ADD COLUMN software_version varchar(100) NULL,
ADD COLUMN database_version varchar(100) NULL;