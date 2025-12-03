-- Create aircraft_counters table for tracking component times
CREATE TABLE public.aircraft_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hobbs NUMERIC DEFAULT 0,
  tach NUMERIC DEFAULT 0,
  airframe_total_time NUMERIC DEFAULT 0,
  engine_total_time NUMERIC DEFAULT 0,
  prop_total_time NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.aircraft_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own counters"
ON public.aircraft_counters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own counters"
ON public.aircraft_counters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own counters"
ON public.aircraft_counters FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_aircraft_counters_updated_at
BEFORE UPDATE ON public.aircraft_counters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();