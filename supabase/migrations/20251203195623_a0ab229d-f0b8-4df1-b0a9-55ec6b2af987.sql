-- Add alert threshold columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN alert_days integer DEFAULT 7,
ADD COLUMN alert_hours integer DEFAULT 10;