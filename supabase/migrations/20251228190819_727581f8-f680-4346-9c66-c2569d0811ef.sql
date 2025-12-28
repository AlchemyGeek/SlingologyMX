-- Create table to track admin last-seen timestamps for notifications
CREATE TABLE public.admin_notification_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL, -- 'users', 'bug_reports', 'feature_requests'
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.admin_notification_status ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own notification status
CREATE POLICY "Admins can view own notification status"
ON public.admin_notification_status
FOR SELECT
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert their own notification status
CREATE POLICY "Admins can insert own notification status"
ON public.admin_notification_status
FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update their own notification status
CREATE POLICY "Admins can update own notification status"
ON public.admin_notification_status
FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete their own notification status
CREATE POLICY "Admins can delete own notification status"
ON public.admin_notification_status
FOR DELETE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));