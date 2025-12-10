-- Create enums for bug reports
CREATE TYPE public.bug_category AS ENUM (
  'Dashboard',
  'Maintenance Logs',
  'AD / Service Bulletins',
  'Profile / Account',
  'Data Export',
  'Notifications',
  'Other'
);

CREATE TYPE public.bug_severity AS ENUM (
  'Minor',
  'Moderate',
  'Major',
  'Critical'
);

CREATE TYPE public.device_type AS ENUM (
  'Desktop',
  'Laptop',
  'Tablet',
  'Phone',
  'Other'
);

CREATE TYPE public.bug_status AS ENUM (
  'New',
  'In Progress',
  'Waiting for User',
  'Resolved',
  'Closed (Won''t Fix)',
  'Closed (Duplicate)'
);

CREATE TYPE public.bug_priority AS ENUM (
  'Low',
  'Medium',
  'High',
  'Urgent'
);

-- Create bug_reports table
CREATE TABLE public.bug_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- User-filled fields
  title varchar(200) NOT NULL,
  description text NOT NULL,
  steps_to_reproduce text,
  expected_result text,
  actual_result text NOT NULL,
  category bug_category NOT NULL,
  severity bug_severity NOT NULL,
  browser varchar(100),
  operating_system varchar(100),
  device_type device_type,
  attachment_url text,
  
  -- Admin-filled fields
  status bug_status NOT NULL DEFAULT 'New',
  priority bug_priority NOT NULL DEFAULT 'Medium',
  assigned_to varchar(100),
  root_cause text,
  resolution_summary text,
  internal_notes text,
  
  -- System timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own bug reports
CREATE POLICY "Users can view own bug reports"
ON public.bug_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all bug reports
CREATE POLICY "Admins can view all bug reports"
ON public.bug_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can create their own bug reports
CREATE POLICY "Users can create own bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own bug reports (application will restrict admin-only fields)
CREATE POLICY "Users can update own bug reports"
ON public.bug_reports
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can update any bug report
CREATE POLICY "Admins can update any bug report"
ON public.bug_reports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Users can delete their own bug reports
CREATE POLICY "Users can delete own bug reports"
ON public.bug_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can delete any bug report
CREATE POLICY "Admins can delete any bug report"
ON public.bug_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic updated_at timestamps
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON public.bug_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_bug_reports_user_id ON public.bug_reports(user_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);