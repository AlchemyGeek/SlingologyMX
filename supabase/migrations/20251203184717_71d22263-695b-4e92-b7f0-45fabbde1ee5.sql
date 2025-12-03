-- Create enum for notification basis
CREATE TYPE public.notification_basis AS ENUM ('Date', 'Counter');

-- Create enum for counter types
CREATE TYPE public.counter_type AS ENUM ('Hobbs', 'Tach', 'Airframe TT', 'Engine TT', 'Prop TT');

-- Add new columns to notifications table
ALTER TABLE public.notifications
ADD COLUMN notification_basis public.notification_basis NOT NULL DEFAULT 'Date',
ADD COLUMN counter_type public.counter_type,
ADD COLUMN initial_counter_value numeric,
ADD COLUMN counter_step integer;