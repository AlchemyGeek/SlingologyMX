-- First drop the partial migration artifacts
DROP TYPE IF EXISTS subscription_type_new;

-- Create new enum type with updated values
CREATE TYPE subscription_type_new AS ENUM (
  'Facilities & Storage',
  'Insurance',
  'Avionics Data & Services',
  'Navigation, Charts & Flight Planning',
  'Weather Services',
  'Maintenance, Compliance & Records',
  'Hardware Services & Fees',
  'Training & Proficiency',
  'Memberships & Associations',
  'Publications & Media',
  'Operations & Administration',
  'Other'
);

-- Update existing records to compatible values via text column
ALTER TABLE public.subscriptions ADD COLUMN type_temp text;
UPDATE public.subscriptions SET type_temp = 
  CASE type::text
    WHEN 'Training, Proficiency & Safety' THEN 'Training & Proficiency'
    WHEN 'Hardware-Related Services' THEN 'Hardware Services & Fees'
    WHEN 'Aviation Community Memberships' THEN 'Memberships & Associations'
    WHEN 'EFB & Flight Planning' THEN 'Navigation, Charts & Flight Planning'
    ELSE type::text
  END;

-- Drop old column and create new one with proper type
ALTER TABLE public.subscriptions DROP COLUMN type;
ALTER TABLE public.subscriptions ADD COLUMN type subscription_type_new;
UPDATE public.subscriptions SET type = type_temp::subscription_type_new;
ALTER TABLE public.subscriptions DROP COLUMN type_temp;
ALTER TABLE public.subscriptions ALTER COLUMN type SET NOT NULL;

-- Drop old enum and rename new one
DROP TYPE subscription_type;
ALTER TYPE subscription_type_new RENAME TO subscription_type;