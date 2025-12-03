-- Drop the existing policy
DROP POLICY IF EXISTS "Customers can cancel their pending rides" ON public.rides;

-- Create updated policy that allows cancellation in more states
CREATE POLICY "Customers can cancel their pending rides" 
ON public.rides 
FOR UPDATE 
USING (
  (auth.uid() = customer_id) 
  AND (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'driver_en_route'::text, 'driver_arrived'::text]))
)
WITH CHECK (
  (auth.uid() = customer_id) 
  AND (status = ANY (ARRAY['cancelled'::text, 'pending'::text, 'accepted'::text, 'driver_en_route'::text, 'driver_arrived'::text]))
);