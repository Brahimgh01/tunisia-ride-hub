-- Phase 1: CRITICAL Security Fixes

-- 1.1 Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('customer', 'driver', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can manage roles
CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- RLS: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- 1.2 Create security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.verify_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- 1.3 Migrate existing data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role FROM public.profiles WHERE is_admin = true;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::app_role FROM public.profiles 
WHERE role IN ('customer', 'driver') AND NOT is_admin
ON CONFLICT (user_id, role) DO NOTHING;

-- 1.4 Update surge_pricing RLS to use security definer function
DROP POLICY IF EXISTS "Admins can manage surge pricing" ON public.surge_pricing;
CREATE POLICY "Admins can manage surge pricing"
ON public.surge_pricing
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 1.5 Remove vulnerable columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- 1.6 Update profiles RLS to prevent privilege escalation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update safe profile fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 1.7 Create safe driver locations view with rounded coordinates
CREATE OR REPLACE VIEW public.driver_locations_safe AS
SELECT 
  id,
  driver_id,
  ROUND(latitude::NUMERIC, 2) as latitude,
  ROUND(longitude::NUMERIC, 2) as longitude,
  is_available,
  last_updated
FROM public.driver_locations
WHERE is_available = true;

GRANT SELECT ON public.driver_locations_safe TO authenticated;

-- 1.8 Secure delivery RLS policies
DROP POLICY IF EXISTS "Drivers can view their assigned deliveries" ON public.deliveries;
CREATE POLICY "Drivers can view only assigned deliveries"
ON public.deliveries
FOR SELECT
USING (
  auth.uid() = driver_id AND
  driver_id IS NOT NULL
);

-- 1.9 Add delivery assignment constraint
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS check_driver_assignment;
ALTER TABLE public.deliveries ADD CONSTRAINT check_driver_assignment
CHECK (
  (status = 'pending' AND driver_id IS NULL) OR
  (status != 'pending' AND driver_id IS NOT NULL)
) NOT VALID;

-- Validate existing data
ALTER TABLE public.deliveries VALIDATE CONSTRAINT check_driver_assignment;