-- Clean up stale pending rides older than 24 hours by marking them as expired
UPDATE public.rides 
SET status = 'cancelled', 
    cancelled_at = now(), 
    cancellation_reason = 'expired',
    cancelled_by = 'system'
WHERE status = 'pending' 
  AND driver_id IS NULL 
  AND created_at < now() - interval '24 hours';

-- Add vehicle_photo_url column to driver_profiles if it doesn't exist
ALTER TABLE public.driver_profiles 
ADD COLUMN IF NOT EXISTS vehicle_photo_url text;