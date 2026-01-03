-- Create enums for transactions
CREATE TYPE public.transaction_direction AS ENUM ('Debit', 'Credit');
CREATE TYPE public.transaction_intent AS ENUM ('Ownership', 'Operation', 'Maintenance', 'Compliance', 'Capital', 'Training', 'Travel', 'Other');
CREATE TYPE public.transaction_category AS ENUM ('Fuel', 'Oil & Consumables', 'Hangar / Tie-Down', 'Insurance', 'Avionics', 'Maintenance Labor', 'Maintenance Parts', 'Training', 'Travel', 'Tools & Equipment', 'Other');
CREATE TYPE public.transaction_status AS ENUM ('Pending', 'Posted', 'Skipped', 'Voided');
CREATE TYPE public.transaction_source AS ENUM ('Manual', 'Commitment', 'Imported');
CREATE TYPE public.reference_type AS ENUM ('Commitment', 'Maintenance', 'Directive', 'Compliance', 'Equipment', 'Trip', 'Other');
CREATE TYPE public.allocation_method AS ENUM ('Straight-line', 'By Flight Hours', 'Custom');
CREATE TYPE public.allocation_period_unit AS ENUM ('Days', 'Months');
CREATE TYPE public.counter_type_for_hour_allocation AS ENUM ('Tach', 'Hobbs', 'EngineHours', 'AirframeHours', 'FlightTime', 'BlockTime');

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aircraft_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  transaction_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  direction transaction_direction NOT NULL,
  intent transaction_intent NOT NULL,
  category transaction_category NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status transaction_status NOT NULL DEFAULT 'Pending',
  source transaction_source NOT NULL DEFAULT 'Manual',
  reference_id UUID,
  reference_type reference_type,
  generated_for_period VARCHAR,
  attachment_urls JSONB DEFAULT '[]',
  notes TEXT,
  include_in_cash_flow BOOLEAN NOT NULL DEFAULT true,
  include_in_ownership_total BOOLEAN NOT NULL DEFAULT true,
  include_in_cost_per_hour BOOLEAN NOT NULL DEFAULT false,
  allocate_over_time BOOLEAN NOT NULL DEFAULT false,
  allocation_method allocation_method,
  allocation_period_value INTEGER,
  allocation_period_unit allocation_period_unit,
  allocation_start_date DATE,
  allocation_end_date DATE,
  counter_type_for_hour_allocation counter_type_for_hour_allocation,
  counter_start_value NUMERIC,
  counter_end_value NUMERIC,
  tach_hours NUMERIC,
  hobbs_hours NUMERIC,
  flight_time_hours NUMERIC,
  block_time_hours NUMERIC,
  cycles INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any transactions"
ON public.transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();