-- Fix the RLS policy for canceling rides
-- Drop the old policy and create a new one that allows cancellation
DROP POLICY IF EXISTS "Customers can cancel their pending rides" ON rides;

CREATE POLICY "Customers can cancel their pending rides"
ON rides
FOR UPDATE
TO authenticated
USING (
  auth.uid() = customer_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = customer_id 
  AND status IN ('canceled', 'pending')
);