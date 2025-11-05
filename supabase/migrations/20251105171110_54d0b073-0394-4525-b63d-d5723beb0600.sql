-- Create trigger for ride status notifications
DROP TRIGGER IF EXISTS notify_ride_status_change_trigger ON public.rides;

CREATE TRIGGER notify_ride_status_change_trigger
AFTER UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.notify_ride_status_change();