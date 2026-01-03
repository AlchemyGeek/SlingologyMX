-- Remove counter snapshot fields from transactions table
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS tach_hours,
DROP COLUMN IF EXISTS hobbs_hours,
DROP COLUMN IF EXISTS flight_time_hours,
DROP COLUMN IF EXISTS block_time_hours,
DROP COLUMN IF EXISTS cycles;