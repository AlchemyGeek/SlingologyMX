-- Allow admins to delete profiles (needed for delete user account functionality)
CREATE POLICY "Admins can delete any profile"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user data from all major tables
CREATE POLICY "Admins can delete any maintenance logs"
ON public.maintenance_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any directives"
ON public.directives
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any notifications"
ON public.notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any subscriptions"
ON public.subscriptions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any aircraft_counters"
ON public.aircraft_counters
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any aircraft_counter_history"
ON public.aircraft_counter_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any aircraft_directive_status"
ON public.aircraft_directive_status
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any directive_history"
ON public.directive_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any maintenance_directive_compliance"
ON public.maintenance_directive_compliance
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view counts from all user tables
CREATE POLICY "Admins can view all maintenance logs"
ON public.maintenance_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all directives"
ON public.directives
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all aircraft_counters"
ON public.aircraft_counters
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all aircraft_counter_history"
ON public.aircraft_counter_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all aircraft_directive_status"
ON public.aircraft_directive_status
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all directive_history"
ON public.directive_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all maintenance_directive_compliance"
ON public.maintenance_directive_compliance
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));