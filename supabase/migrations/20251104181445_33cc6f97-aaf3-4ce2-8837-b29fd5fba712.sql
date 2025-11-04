-- Fix RLS policy for ride cancellation
DROP POLICY IF EXISTS "Customers can cancel their pending rides" ON public.rides;

CREATE POLICY "Customers can cancel their pending rides"
ON public.rides
FOR UPDATE
TO authenticated
USING (
  auth.uid() = customer_id 
  AND status IN ('pending', 'accepted')
)
WITH CHECK (
  auth.uid() = customer_id 
  AND status IN ('cancelled', 'pending', 'accepted')
);