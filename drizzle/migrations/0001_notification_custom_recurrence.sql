ALTER TYPE public.recurrence_type ADD VALUE IF NOT EXISTS 'Custom';
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recurrence_interval integer,
  ADD COLUMN IF NOT EXISTS recurrence_unit text;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recurrence_interval_positive CHECK (recurrence_interval IS NULL OR recurrence_interval > 0),
  ADD CONSTRAINT notifications_recurrence_unit_valid CHECK (recurrence_unit IS NULL OR recurrence_unit IN ('Days','Weeks','Months','Years'));