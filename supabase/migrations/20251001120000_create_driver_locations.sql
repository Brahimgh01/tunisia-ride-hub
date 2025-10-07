-- Migration: Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_available BOOLEAN DEFAULT TRUE
);

-- Enable RLS for driver_locations
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Drivers can update their own location" ON public.driver_locations;
CREATE POLICY "Drivers can update their own location"
  ON public.driver_locations FOR UPDATE USING (auth.uid() = driver_id);


DROP POLICY IF EXISTS "Drivers can insert their own location" ON public.driver_locations;
CREATE POLICY "Drivers can insert their own location"
  ON public.driver_locations FOR INSERT WITH CHECK (auth.uid() = driver_id);


DROP POLICY IF EXISTS "Customers can view available drivers" ON public.driver_locations;
CREATE POLICY "Customers can view available drivers"
  ON public.driver_locations FOR SELECT USING (is_available = TRUE);

-- Index for fast lookup of available drivers
CREATE INDEX IF NOT EXISTS idx_driver_locations_available ON public.driver_locations(is_available);
