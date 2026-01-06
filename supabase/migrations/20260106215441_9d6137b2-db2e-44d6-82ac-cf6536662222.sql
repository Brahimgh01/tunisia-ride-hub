-- Allow drivers to re-accept (claim) an unassigned pending ride after cancelling
-- (fixes "ride is no longer available" when driver_id is NULL)

BEGIN;

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
    AND has_role(auth.uid(), 'driver'::app_role)
  )
)
WITH CHECK (
  (driver_id IS NULL OR driver_id = auth.uid())
);

COMMIT;