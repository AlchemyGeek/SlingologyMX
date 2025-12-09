-- Create junction table for maintenance log to directive compliance links
CREATE TABLE public.maintenance_directive_compliance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_log_id UUID NOT NULL REFERENCES public.maintenance_logs(id) ON DELETE CASCADE,
  directive_id UUID NOT NULL REFERENCES public.directives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Compliance data (same fields as aircraft_directive_status)
  compliance_status TEXT NOT NULL DEFAULT 'Complied',
  compliance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  counter_type TEXT,
  counter_value NUMERIC,
  
  -- Performer info
  performed_by_name VARCHAR(100),
  performed_by_role VARCHAR(50),
  maintenance_provider_name VARCHAR(120),
  
  -- Costs
  labor_hours_actual NUMERIC,
  labor_rate NUMERIC,
  parts_cost NUMERIC,
  total_cost NUMERIC,
  
  -- Notes and evidence
  owner_notes TEXT,
  compliance_links JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure each directive is only linked once per maintenance log
  UNIQUE(maintenance_log_id, directive_id)
);

-- Enable RLS
ALTER TABLE public.maintenance_directive_compliance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own maintenance directive compliance"
  ON public.maintenance_directive_compliance
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own maintenance directive compliance"
  ON public.maintenance_directive_compliance
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance directive compliance"
  ON public.maintenance_directive_compliance
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance directive compliance"
  ON public.maintenance_directive_compliance
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_maintenance_directive_compliance_updated_at
  BEFORE UPDATE ON public.maintenance_directive_compliance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();