-- Create community_service_bulletins table for shared SB interpretations
CREATE TABLE public.community_service_bulletins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core SB fields (aircraft-agnostic)
  directive_type public.directive_type NOT NULL,
  severity public.directive_severity NOT NULL,
  directive_status public.directive_status NOT NULL DEFAULT 'Active',
  category public.directive_category NOT NULL,
  compliance_scope public.compliance_scope NOT NULL,
  
  directive_code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  issuing_authority VARCHAR(100),
  revision VARCHAR(50),
  
  issue_date DATE,
  effective_date DATE,
  
  -- Initial due settings
  initial_due_type public.initial_due_type,
  initial_due_hours NUMERIC,
  initial_due_months INTEGER,
  
  -- Recurrence settings
  repeat_hours NUMERIC,
  repeat_months INTEGER,
  counter_type TEXT,
  
  -- Applicability (generic, not aircraft-specific)
  applicable_serial_range TEXT,
  applicability_notes TEXT,
  applicability_category TEXT,
  applicability_model TEXT,
  
  -- Equipment reference (generic)
  equipment_name TEXT,
  equipment_model TEXT,
  
  -- Version info
  software_version VARCHAR(100),
  database_version VARCHAR(100),
  
  -- Action details
  action_types TEXT[],
  terminating_action_exists BOOLEAN NOT NULL DEFAULT false,
  terminating_action_summary VARCHAR(500),
  requires_log_entry BOOLEAN NOT NULL DEFAULT true,
  
  -- Source links
  source_links JSONB DEFAULT '[]'::jsonb,
  
  -- Community metadata
  description TEXT, -- Maintainer's interpretation notes
  version_notes TEXT, -- Notes about what changed in this version
  version_number INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_community_sbs_maintainer ON public.community_service_bulletins(maintainer_id);
CREATE INDEX idx_community_sbs_category ON public.community_service_bulletins(category);
CREATE INDEX idx_community_sbs_directive_code ON public.community_service_bulletins(directive_code);

-- Enable RLS
ALTER TABLE public.community_service_bulletins ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only maintainer can modify
CREATE POLICY "Anyone can view community SBs"
  ON public.community_service_bulletins
  FOR SELECT
  USING (true);

CREATE POLICY "Maintainers can create community SBs"
  ON public.community_service_bulletins
  FOR INSERT
  WITH CHECK (auth.uid() = maintainer_id);

CREATE POLICY "Maintainers can update own community SBs"
  ON public.community_service_bulletins
  FOR UPDATE
  USING (auth.uid() = maintainer_id);

CREATE POLICY "Maintainers can delete own community SBs"
  ON public.community_service_bulletins
  FOR DELETE
  USING (auth.uid() = maintainer_id);

-- Create community_sb_feedback table for reactions
CREATE TABLE public.community_sb_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_sb_id UUID NOT NULL REFERENCES public.community_service_bulletins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 = downvote, 1 = upvote
  reason TEXT, -- Optional reason for downvotes
  
  -- Maintainer response
  maintainer_status TEXT CHECK (maintainer_status IN ('Incorporated', 'Acknowledged')),
  maintainer_response_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(community_sb_id, user_id) -- One vote per user per SB
);

-- Enable RLS
ALTER TABLE public.community_sb_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view feedback"
  ON public.community_sb_feedback
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create own feedback"
  ON public.community_sb_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON public.community_sb_feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feedback"
  ON public.community_sb_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Maintainers can update feedback status"
  ON public.community_sb_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_service_bulletins csb
      WHERE csb.id = community_sb_id AND csb.maintainer_id = auth.uid()
    )
  );

-- Create community_sb_usage table to track which local directives came from community SBs
CREATE TABLE public.community_sb_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_sb_id UUID NOT NULL REFERENCES public.community_service_bulletins(id) ON DELETE SET NULL,
  local_directive_id UUID NOT NULL REFERENCES public.directives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Track version at time of use
  used_version_number INTEGER NOT NULL,
  
  -- Track if user has modified the local copy
  is_modified BOOLEAN NOT NULL DEFAULT false,
  
  -- Track if user has been notified of updates
  last_seen_version INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(local_directive_id) -- Each local directive can only be linked to one community SB
);

-- Enable RLS
ALTER TABLE public.community_sb_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own usage records"
  ON public.community_sb_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage records"
  ON public.community_sb_usage
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own usage records"
  ON public.community_sb_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage records"
  ON public.community_sb_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own usage records"
  ON public.community_sb_usage
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create community_sb_update_notifications table
CREATE TABLE public.community_sb_update_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_sb_id UUID NOT NULL REFERENCES public.community_service_bulletins(id) ON DELETE CASCADE,
  local_directive_id UUID REFERENCES public.directives(id) ON DELETE SET NULL,
  
  -- Update details
  old_version_number INTEGER NOT NULL,
  new_version_number INTEGER NOT NULL,
  version_notes TEXT,
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_sb_update_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own update notifications"
  ON public.community_sb_update_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.community_sb_update_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.community_sb_update_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.community_sb_update_notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_community_sbs_updated_at
  BEFORE UPDATE ON public.community_service_bulletins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_community_sb_feedback_updated_at
  BEFORE UPDATE ON public.community_sb_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_community_sb_usage_updated_at
  BEFORE UPDATE ON public.community_sb_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();