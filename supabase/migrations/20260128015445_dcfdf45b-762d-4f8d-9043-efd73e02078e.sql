-- Fix RLS policies for profiles table
-- Drop existing SELECT policies and recreate with correct restrictions
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Ensure users can only view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Fix RLS policies for bug_reports table  
-- Drop existing SELECT policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Admins can view all bug reports" ON public.bug_reports;

-- Recreate with correct restrictions - users only see their own, admins see all
CREATE POLICY "Users can view own bug reports" 
ON public.bug_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bug reports" 
ON public.bug_reports 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));