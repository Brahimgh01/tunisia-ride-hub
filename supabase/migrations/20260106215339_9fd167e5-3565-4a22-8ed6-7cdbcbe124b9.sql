-- Fix duplicate notifications + allow drivers to re-accept unassigned pending rides

BEGIN;

-- 1) Remove duplicate trigger that calls the same function twice
DROP TRIGGER IF EXISTS notify_ride_status_change_trigger ON public.rides;

-- 2) Update driver UPDATE policy so a verified driver can claim a pending, unassigned ride
DROP POLICY IF EXISTS "Drivers can update their assigned rides" ON public.rides;

CREATE POLICY "Drivers can update their assigned rides"
ON public.rides
FOR UPDATE
TO public
USING (
  auth.uid() = driver_id
  OR (
    driver_id IS NULL
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.driver_profiles dp
      WHERE dp.driver_id = auth.uid()
        AND dp.is_verified = true
    )
  )
)
WITH CHECK (
  (driver_id IS NULL OR driver_id = auth.uid())
);

-- 3) Extend notification function to:
--    - handle cancelled vs canceled spelling
--    - notify customer when driver releases ride back to pending
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
  IF NEW.status = 'driver_arrived' AND OLD.status IS DISTINCT FROM 'driver_arrived' THEN
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
  IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
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
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Completed',
      'Your ride has been completed. Thank you!',
      'ride_completed',
      NEW.id
    );
  END IF;

  -- Notify customer when driver cancels/release and ride goes back to pending
  IF OLD.driver_id IS NOT NULL
     AND NEW.driver_id IS NULL
     AND NEW.status = 'pending'
     AND OLD.status IN ('accepted', 'driver_en_route', 'driver_arrived', 'in_progress') THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Driver Cancelled',
      'Your driver cancelled the ride. We are finding another driver.',
      'driver_cancelled',
      NEW.id
    );
  END IF;

  -- Notify both parties on cancellation (support both spellings)
  IF NEW.status IN ('cancelled', 'canceled') AND OLD.status IS DISTINCT FROM NEW.status THEN
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

COMMIT;