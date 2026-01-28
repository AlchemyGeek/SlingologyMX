-- Change cost column from integer to numeric to support decimal values (cents)
ALTER TABLE public.subscriptions 
ALTER COLUMN cost TYPE numeric USING cost::numeric;