-- Create enums for Directives & Bulletins

CREATE TYPE public.directive_type AS ENUM (
  'FAA Airworthiness Directive',
  'Manufacturer Alert',
  'Manufacturer Mandatory',
  'Service Bulletin',
  'Service Instruction',
  'Information Bulletin',
  'Other'
);

CREATE TYPE public.directive_severity AS ENUM (
  'Emergency',
  'Mandatory',
  'Recommended',
  'Informational'
);

CREATE TYPE public.directive_status AS ENUM (
  'Active',
  'Superseded',
  'Cancelled',
  'Proposed'
);

CREATE TYPE public.directive_category AS ENUM (
  'Airframe',
  'Engine',
  'Propeller',
  'Avionics',
  'System',
  'Appliance',
  'Other'
);

CREATE TYPE public.compliance_scope AS ENUM (
  'One-Time',
  'Recurring',
  'Conditional',
  'Informational Only'
);

CREATE TYPE public.initial_due_type AS ENUM (
  'Before Next Flight',
  'By Date',
  'By Total Time (Hours)',
  'By Calendar (Months)',
  'At Next Inspection',
  'Other'
);

CREATE TYPE public.applicability_status AS ENUM (
  'Applies',
  'Does Not Apply',
  'Unsure'
);

CREATE TYPE public.db_compliance_status AS ENUM (
  'Not Reviewed',
  'Not Complied',
  'Complied Once',
  'Recurring (Current)',
  'Overdue',
  'Not Applicable'
);

CREATE TYPE public.directive_performed_by_role AS ENUM (
  'Owner/Builder',
  'Owner/Pilot',
  'A&P',
  'IA',
  'Rotax IRMT',
  'Maintenance Shop',
  'Other'
);

-- Create directives table (global templates owned by users)
CREATE TABLE public.directives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core identification
  directive_code VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  directive_type public.directive_type NOT NULL,
  severity public.directive_severity NOT NULL,
  directive_status public.directive_status NOT NULL DEFAULT 'Active',
  category public.directive_category NOT NULL,
  
  -- Authority/dates
  issuing_authority VARCHAR(100),
  issue_date DATE,
  effective_date DATE,
  revision VARCHAR(20),
  
  -- Applicability filters
  aircraft_make_model_filter VARCHAR(200),
  engine_model_filter VARCHAR(200),
  prop_model_filter VARCHAR(200),
  applicable_serial_range TEXT,
  applicability_notes TEXT,
  
  -- Compliance requirements
  compliance_scope public.compliance_scope NOT NULL,
  action_types TEXT[], -- array of action types
  initial_due_type public.initial_due_type,
  initial_due_hours NUMERIC,
  initial_due_months INTEGER,
  initial_due_date DATE,
  repeat_hours NUMERIC,
  repeat_months INTEGER,
  terminating_action_exists BOOLEAN NOT NULL DEFAULT false,
  terminating_action_summary VARCHAR(255),
  requires_log_entry BOOLEAN NOT NULL DEFAULT true,
  
  -- Source documents (JSONB array of {description, url})
  source_links JSONB DEFAULT '[]'::jsonb,
  
  -- Meta
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create aircraft_directive_status table (per-aircraft compliance tracking)
CREATE TABLE public.aircraft_directive_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  directive_id UUID NOT NULL REFERENCES public.directives(id) ON DELETE CASCADE,
  
  -- Applicability
  applicability_status public.applicability_status NOT NULL DEFAULT 'Unsure',
  applicability_reason TEXT,
  
  -- Compliance tracking
  compliance_status public.db_compliance_status NOT NULL DEFAULT 'Not Reviewed',
  first_compliance_date DATE,
  first_compliance_tach NUMERIC,
  last_compliance_date DATE,
  last_compliance_tach NUMERIC,
  next_due_date DATE,
  next_due_tach NUMERIC,
  
  -- Performer info
  performed_by_name VARCHAR(100),
  performed_by_role public.directive_performed_by_role,
  owner_notes TEXT,
  
  -- Evidence (JSONB array of {description, url})
  compliance_links JSONB DEFAULT '[]'::jsonb,
  
  -- Costs
  labor_hours_actual NUMERIC,
  labor_rate NUMERIC,
  parts_cost NUMERIC,
  total_cost NUMERIC,
  maintenance_provider_name VARCHAR(120),
  
  -- Meta
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- One status record per directive per user
  UNIQUE(user_id, directive_id)
);

-- Enable RLS
ALTER TABLE public.directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_directive_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for directives
CREATE POLICY "Users can view own directives"
  ON public.directives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own directives"
  ON public.directives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own directives"
  ON public.directives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own directives"
  ON public.directives FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for aircraft_directive_status
CREATE POLICY "Users can view own directive status"
  ON public.aircraft_directive_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own directive status"
  ON public.aircraft_directive_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own directive status"
  ON public.aircraft_directive_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own directive status"
  ON public.aircraft_directive_status FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_directives_updated_at
  BEFORE UPDATE ON public.directives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_aircraft_directive_status_updated_at
  BEFORE UPDATE ON public.aircraft_directive_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();