-- Make cost column nullable in subscriptions table
ALTER TABLE public.subscriptions ALTER COLUMN cost DROP NOT NULL;