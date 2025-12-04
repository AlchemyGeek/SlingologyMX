-- Create directive_history table to track directive lifecycle events
CREATE TABLE public.directive_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  directive_id UUID,
  directive_code VARCHAR NOT NULL,
  directive_title VARCHAR NOT NULL,
  action_type VARCHAR NOT NULL CHECK (action_type IN ('Create', 'Delete', 'Compliance')),
  compliance_status VARCHAR,
  first_compliance_date DATE,
  last_compliance_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.directive_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own directive history"
ON public.directive_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own directive history"
ON public.directive_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own directive history"
ON public.directive_history
FOR DELETE
USING (auth.uid() = user_id);