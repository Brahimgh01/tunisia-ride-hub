-- Add unique constraint on driver_id for upsert to work
ALTER TABLE public.driver_locations 
ADD CONSTRAINT driver_locations_driver_id_unique UNIQUE (driver_id);

-- Make driver_locations RLS more permissive for drivers to insert/update
DROP POLICY IF EXISTS "Drivers can insert their own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can modify their own location" ON public.driver_locations;

CREATE POLICY "Drivers can insert their own location" 
ON public.driver_locations 
FOR INSERT 
WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own location" 
ON public.driver_locations 
FOR UPDATE 
USING (auth.uid() = driver_id);

-- Allow drivers to see their own location regardless of availability
CREATE POLICY "Drivers can view their own location" 
ON public.driver_locations 
FOR SELECT 
USING (auth.uid() = driver_id);

-- Allow verified drivers to see pending rides (for ride assignment to work)
DROP POLICY IF EXISTS "Drivers can accept pending unassigned rides" ON public.rides;

CREATE POLICY "Verified drivers can view pending rides" 
ON public.rides 
FOR SELECT 
USING (
  status = 'pending' 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.driver_id = auth.uid() 
    AND driver_profiles.is_verified = true
  )
);