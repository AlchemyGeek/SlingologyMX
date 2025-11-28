-- Create enums for maintenance logs
CREATE TYPE public.maintenance_category AS ENUM (
  'Airframe',
  'Engine',
  'Propeller',
  'Avionics',
  'Electrical',
  'Interior',
  'Exterior',
  'Accessories',
  'Other'
);

CREATE TYPE public.maintenance_subcategory AS ENUM (
  'Inspection',
  'Repair',
  'Replacement',
  'Modification',
  'Software Update',
  'Compliance',
  'Troubleshooting',
  'Scheduled Maintenance',
  'Other'
);

CREATE TYPE public.compliance_type AS ENUM (
  'None',
  'AD',
  'SB',
  'SL',
  'KAS',
  'ASB',
  'Other'
);

CREATE TYPE public.interval_type AS ENUM (
  'Hours',
  'Calendar',
  'Mixed',
  'None'
);

CREATE TYPE public.performed_by_type AS ENUM (
  'Owner',
  'A&P',
  'LSRM',
  'Repairman',
  'Shop',
  'Other'
);

-- Create maintenance_logs table
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Identity & Classification
  entry_title VARCHAR(120) NOT NULL,
  category maintenance_category NOT NULL,
  subcategory maintenance_subcategory NOT NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Time & Usage
  date_performed DATE NOT NULL,
  hobbs_at_event DECIMAL(6,1),
  tach_at_event DECIMAL(6,1),
  airframe_total_time DECIMAL(7,1),
  engine_total_time DECIMAL(7,1),
  prop_total_time DECIMAL(7,1),
  
  -- Compliance Metadata
  has_compliance_item BOOLEAN DEFAULT false,
  compliance_type compliance_type DEFAULT 'None',
  compliance_reference VARCHAR(40),
  recurring_compliance BOOLEAN DEFAULT false,
  
  -- Next-Due Tracking
  is_recurring_task BOOLEAN DEFAULT false,
  interval_type interval_type DEFAULT 'None',
  interval_hours INTEGER CHECK (interval_hours >= 0 AND interval_hours <= 2000),
  interval_months INTEGER CHECK (interval_months >= 0 AND interval_months <= 240),
  next_due_hours DECIMAL(7,1),
  next_due_date DATE,
  
  -- Performed By
  performed_by_type performed_by_type NOT NULL,
  performed_by_name VARCHAR(80) NOT NULL,
  organization VARCHAR(80),
  
  -- Cost Metadata
  parts_cost DECIMAL(10,2) CHECK (parts_cost >= 0),
  labor_cost DECIMAL(10,2) CHECK (labor_cost >= 0),
  other_cost DECIMAL(10,2) CHECK (other_cost >= 0),
  total_cost DECIMAL(10,2) CHECK (total_cost >= 0),
  vendor_name VARCHAR(80),
  invoice_number VARCHAR(40),
  
  -- Attachments
  attachment_urls TEXT[] DEFAULT '{}',
  
  -- Internal Notes
  internal_notes TEXT CHECK (length(internal_notes) <= 2000),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own maintenance logs"
  ON public.maintenance_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own maintenance logs"
  ON public.maintenance_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance logs"
  ON public.maintenance_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance logs"
  ON public.maintenance_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_logs_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();