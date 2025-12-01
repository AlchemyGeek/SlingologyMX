-- Create enum for feature request status
CREATE TYPE public.feature_status AS ENUM ('open', 'completed', 'duplicate', 'closed');

-- Add status and admin_comment columns to feature_requests
ALTER TABLE public.feature_requests
ADD COLUMN status public.feature_status NOT NULL DEFAULT 'open',
ADD COLUMN admin_comment VARCHAR(50);

-- Update RLS policy to allow admins to update any feature request
CREATE POLICY "Admins can update any feature request"
ON public.feature_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));