-- Enable RLS on driver_profiles table
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can view their own profile
CREATE POLICY "Drivers can view their own profile"
ON public.driver_profiles
FOR SELECT
USING (auth.uid() = driver_id);

-- Policy: Drivers can update their own profile
CREATE POLICY "Drivers can update their own profile"
ON public.driver_profiles
FOR UPDATE
USING (auth.uid() = driver_id);

-- Policy: Drivers can insert their own profile (for manual creation if needed)
CREATE POLICY "Drivers can insert their own profile"
ON public.driver_profiles
FOR INSERT
WITH CHECK (auth.uid() = driver_id);

-- Policy: Customers can view verified driver profiles (needed for ride information)
CREATE POLICY "Customers can view verified drivers"
ON public.driver_profiles
FOR SELECT
USING (is_verified = true);