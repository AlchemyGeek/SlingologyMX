-- Create subscription_type enum
CREATE TYPE subscription_type AS ENUM (
  'EFB & Flight Planning',
  'Avionics Subscriptions',
  'Aircraft Maintenance, Tracking, & Record Services',
  'Proficiency & Safety Tools',
  'Aviation Community Memberships',
  'Weather Tools',
  'Magazine Subscription',
  'Aircraft Operations & Financial Tools',
  'Hardware-Related Annual Fees',
  'Insurance Related Add-Ons',
  'Other'
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_name VARCHAR(200) NOT NULL,
  notes TEXT,
  type subscription_type NOT NULL,
  cost INTEGER NOT NULL CHECK (cost > 0),
  initial_date DATE NOT NULL,
  recurrence recurrence_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add subscription_id to notifications table to link them
ALTER TABLE public.notifications 
ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE;

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add subscription_type to the Constants export
COMMENT ON TYPE subscription_type IS 'Types of subscriptions available';