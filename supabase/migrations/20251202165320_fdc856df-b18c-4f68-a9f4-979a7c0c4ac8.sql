-- Fix search_path for notify_nearest_drivers_on_new_ride function
CREATE OR REPLACE FUNCTION public.notify_nearest_drivers_on_new_ride()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  drv RECORD;
  radius_km numeric := 5;
  max_drivers integer := 5;
  earth_km constant numeric := 6371;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    IF NEW.pickup_lat IS NULL OR NEW.pickup_lng IS NULL THEN
      RETURN NEW;
    END IF;

    FOR drv IN
      SELECT dl.driver_id,
             dl.latitude,
             dl.longitude,
             p.full_name,
             (
               earth_km * 2 * asin(
                 sqrt(
                   least(1,
                     sin(radians(dl.latitude - NEW.pickup_lat)/2)^2
                     + cos(radians(NEW.pickup_lat)) * cos(radians(dl.latitude))
                       * sin(radians(dl.longitude - NEW.pickup_lng)/2)^2
                   )
                 )
               )
             ) AS distance_km
      FROM public.driver_locations dl
      JOIN public.profiles p ON p.user_id = dl.driver_id
      WHERE dl.is_available = TRUE
        AND dl.latitude BETWEEN (NEW.pickup_lat - (radius_km/111.0)) AND (NEW.pickup_lat + (radius_km/111.0))
        AND dl.longitude BETWEEN (NEW.pickup_lng - (radius_km/(111.0 * cos(radians(NEW.pickup_lat))))) AND (NEW.pickup_lng + (radius_km/(111.0 * cos(radians(NEW.pickup_lat)))))
      ORDER BY distance_km
      LIMIT max_drivers
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, ride_id, created_at)
      VALUES (
        drv.driver_id,
        'New Ride Request',
        'New ride ' || round(COALESCE(drv.distance_km, 0.0)::numeric, 2)::text || ' km away. Tap to accept.',
        'ride_request',
        NEW.id,
        now()
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;