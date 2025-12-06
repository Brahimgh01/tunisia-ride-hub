-- Add RLS policies for admins to manage the application

-- Allow admins to view all rides
CREATE POLICY "Admins can view all rides"
ON public.rides
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all rides
CREATE POLICY "Admins can update all rides"
ON public.rides
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all user_roles
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all driver_profiles
CREATE POLICY "Admins can view all driver_profiles"
ON public.driver_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all driver_profiles (for verify/unverify)
CREATE POLICY "Admins can update all driver_profiles"
ON public.driver_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all driver_locations
CREATE POLICY "Admins can view all driver_locations"
ON public.driver_locations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all driver_subscriptions
CREATE POLICY "Admins can view all driver_subscriptions"
ON public.driver_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));