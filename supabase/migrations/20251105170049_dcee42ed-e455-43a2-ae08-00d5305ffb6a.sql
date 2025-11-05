-- Fix 1: Update driver_locations RLS policy to check if the DRIVER is verified, not the viewer
DROP POLICY IF EXISTS "Public read access to safe driver locations" ON public.driver_locations;

CREATE POLICY "Public read access to verified available drivers"
ON public.driver_locations
FOR SELECT
USING (
  is_available = true 
  AND EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE driver_profiles.driver_id = driver_locations.driver_id
    AND driver_profiles.is_verified = true
  )
);

-- Fix 2: Allow drivers to self-assign and accept pending unassigned rides
CREATE POLICY "Drivers can accept pending unassigned rides"
ON public.rides
FOR UPDATE
USING (
  status = 'pending' 
  AND (driver_id IS NULL OR driver_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_id = auth.uid() 
    AND is_verified = true
  )
)
WITH CHECK (
  driver_id = auth.uid()
  AND status IN ('pending', 'accepted')
);

-- Fix 3: Update notification trigger to only notify on driver assignment
-- Drop existing trigger first, then function
DROP TRIGGER IF EXISTS on_ride_status_change ON public.rides;
DROP TRIGGER IF EXISTS notify_ride_status_changes ON public.rides;
DROP FUNCTION IF EXISTS notify_ride_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_ride_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify driver when ride is assigned to them
  IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id) THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.driver_id,
      'New Ride Request',
      'You have a new ride request assigned to you!',
      'ride_request',
      NEW.id
    );
  END IF;

  -- Notify customer when driver accepts
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Accepted',
      'Your ride has been accepted by a driver!',
      'ride_accepted',
      NEW.id
    );
  END IF;
  
  -- Notify customer when driver arrives
  IF NEW.status = 'driver_arrived' AND OLD.status != 'driver_arrived' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Driver Arrived',
      'Your driver has arrived at the pickup location.',
      'ride_started',
      NEW.id
    );
  END IF;
  
  -- Notify customer when ride starts
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Started',
      'Your ride is now in progress.',
      'ride_started',
      NEW.id
    );
  END IF;
  
  -- Notify customer when ride completes
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Completed',
      'Your ride has been completed. Thank you!',
      'ride_completed',
      NEW.id
    );
  END IF;
  
  -- Notify both parties on cancellation
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Cancelled',
      'Your ride has been cancelled.',
      'ride_cancelled',
      NEW.id
    );
    
    -- Notify driver if assigned
    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, ride_id)
      VALUES (
        NEW.driver_id,
        'Ride Cancelled',
        'The ride has been cancelled.',
        'ride_cancelled',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_ride_status_change
AFTER UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.notify_ride_status_change();