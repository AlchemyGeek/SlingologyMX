-- Add aircraft_id to subscriptions table (nullable initially)
ALTER TABLE public.subscriptions 
ADD COLUMN aircraft_id uuid;

-- Update existing subscriptions to use the user's primary aircraft
UPDATE public.subscriptions s
SET aircraft_id = (
  SELECT a.id 
  FROM public.aircraft a 
  WHERE a.user_id = s.user_id 
  AND a.is_primary = true 
  LIMIT 1
);

-- For any remaining without a primary, use any aircraft
UPDATE public.subscriptions s
SET aircraft_id = (
  SELECT a.id 
  FROM public.aircraft a 
  WHERE a.user_id = s.user_id 
  LIMIT 1
)
WHERE s.aircraft_id IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.subscriptions 
ALTER COLUMN aircraft_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_aircraft_id_fkey 
FOREIGN KEY (aircraft_id) REFERENCES public.aircraft(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_subscriptions_aircraft_id ON public.subscriptions(aircraft_id);