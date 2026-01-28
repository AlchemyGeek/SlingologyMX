-- Fix RLS policies for profiles table to be properly restrictive
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create properly restrictive SELECT policies (PERMISSIVE - users OR admins can access)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS policies for bug_reports table
DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Admins can view all bug reports" ON public.bug_reports;

-- Create properly restrictive SELECT policies
CREATE POLICY "Users can view own bug reports" 
ON public.bug_reports 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bug reports" 
ON public.bug_reports 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));