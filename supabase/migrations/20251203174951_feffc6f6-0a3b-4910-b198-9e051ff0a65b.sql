-- Create counter history table
CREATE TABLE public.aircraft_counter_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hobbs NUMERIC DEFAULT 0,
  tach NUMERIC DEFAULT 0,
  airframe_total_time NUMERIC DEFAULT 0,
  engine_total_time NUMERIC DEFAULT 0,
  prop_total_time NUMERIC DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('Dashboard', 'Maintenance Record')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aircraft_counter_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own counter history"
  ON public.aircraft_counter_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own counter history"
  ON public.aircraft_counter_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own counter history"
  ON public.aircraft_counter_history
  FOR DELETE
  USING (auth.uid() = user_id);