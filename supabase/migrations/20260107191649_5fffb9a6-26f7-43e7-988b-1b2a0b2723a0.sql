-- Create enum for reserve type
CREATE TYPE public.reserve_type AS ENUM (
  'Engine',
  'Propeller',
  'Gearbox',
  'Parachute',
  'Battery',
  'Avionics',
  'Other'
);

-- Create enum for reserve basis type
CREATE TYPE public.reserve_basis_type AS ENUM (
  'Calendar',
  'Hours',
  'Cycles'
);

-- Create enum for calendar interval unit
CREATE TYPE public.reserve_interval_unit AS ENUM (
  'Months',
  'Years'
);

-- Create enum for reserve accrual method
CREATE TYPE public.reserve_accrual_method AS ENUM (
  'Straight-line',
  'None'
);

-- Create enum for reserve status
CREATE TYPE public.reserve_status AS ENUM (
  'Active',
  'Paused',
  'Retired'
);

-- Create reserves table
CREATE TABLE public.reserves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aircraft_id UUID NOT NULL REFERENCES public.aircraft(id) ON DELETE CASCADE,
  
  -- Identity & scope
  title VARCHAR NOT NULL,
  reserve_type public.reserve_type NOT NULL,
  
  -- Trigger basis
  basis_type public.reserve_basis_type NOT NULL,
  
  -- Calendar-based fields
  interval_value INTEGER,
  interval_unit public.reserve_interval_unit,
  start_date DATE,
  
  -- Hours-based fields
  limit_hours NUMERIC,
  counter_type TEXT,
  start_counter_value NUMERIC,
  
  -- Cycles-based fields
  limit_cycles INTEGER,
  start_cycle_count INTEGER,
  
  -- Cost model
  expected_cost NUMERIC,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  cost_estimate_date DATE,
  cost_source_notes TEXT,
  
  -- Accrual behavior
  accrual_method public.reserve_accrual_method NOT NULL DEFAULT 'Straight-line',
  include_in_true_cost BOOLEAN NOT NULL DEFAULT false,
  include_in_cost_per_hour BOOLEAN NOT NULL DEFAULT false,
  
  -- Lifecycle
  status public.reserve_status NOT NULL DEFAULT 'Active',
  
  -- Links
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  maintenance_log_id UUID REFERENCES public.maintenance_logs(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reserves ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own reserves"
  ON public.reserves FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reserves"
  ON public.reserves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reserves"
  ON public.reserves FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reserves"
  ON public.reserves FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reserves"
  ON public.reserves FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any reserves"
  ON public.reserves FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_reserves_updated_at
  BEFORE UPDATE ON public.reserves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();