-- Drop existing driver update policy
DROP POLICY IF EXISTS "Drivers can update their assigned rides" ON public.rides;

-- Create new policy that allows drivers to update rides they're assigned to
-- The WITH CHECK allows setting driver_id to null (releasing the ride) or keeping it as their ID
CREATE POLICY "Drivers can update their assigned rides" 
ON public.rides 
FOR UPDATE 
USING (auth.uid() = driver_id)
WITH CHECK (
  driver_id IS NULL 
  OR driver_id = auth.uid()
);