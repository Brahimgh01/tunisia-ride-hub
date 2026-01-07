-- Security fixes from linter:
-- 1) Make view use invoker security
-- 2) Remove overly-permissive notifications INSERT policy

CREATE OR REPLACE VIEW public.driver_locations_safe
WITH (security_invoker = true)
AS
SELECT dl.id,
       dl.driver_id,
       dl.latitude,
       dl.longitude,
       dl.is_available,
       dl.last_updated
  FROM public.driver_locations dl
  JOIN public.driver_profiles dp ON dl.driver_id = dp.driver_id
 WHERE dl.is_available = true
   AND dp.is_verified = true;

GRANT SELECT ON public.driver_locations_safe TO anon, authenticated;

-- Tighten notifications INSERT policy (triggers run as postgres and bypass RLS)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
