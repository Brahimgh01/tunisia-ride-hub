-- Enable REPLICA IDENTITY FULL for driver_locations table for realtime updates
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;