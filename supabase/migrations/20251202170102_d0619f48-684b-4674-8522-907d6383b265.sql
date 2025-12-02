-- Enable REPLICA IDENTITY FULL for rides table for realtime updates
ALTER TABLE public.rides REPLICA IDENTITY FULL;