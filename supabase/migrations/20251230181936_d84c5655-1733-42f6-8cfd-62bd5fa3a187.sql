-- Add final_date column to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN final_date date NULL;