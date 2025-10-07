-- Create deliveries table for package delivery service
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  driver_id UUID,
  pickup_location TEXT NOT NULL,
  pickup_lat NUMERIC NOT NULL,
  pickup_lng NUMERIC NOT NULL,
  dropoff_location TEXT NOT NULL,
  dropoff_lat NUMERIC NOT NULL,
  dropoff_lng NUMERIC NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  package_description TEXT,
  package_size TEXT NOT NULL DEFAULT 'small',
  estimated_price NUMERIC,
  final_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_notes TEXT,
  driver_notes TEXT,
  customer_rating INTEGER,
  driver_rating INTEGER,
  distance_km NUMERIC,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on deliveries table
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Customers can create deliveries
CREATE POLICY "Customers can create deliveries"
ON public.deliveries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

-- Customers can view their own deliveries
CREATE POLICY "Customers can view their own deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

-- Customers can cancel their pending deliveries
CREATE POLICY "Customers can cancel their pending deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id AND status = 'pending');

-- Drivers can view their assigned deliveries
CREATE POLICY "Drivers can view their assigned deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Drivers can update their assigned deliveries
CREATE POLICY "Drivers can update their assigned deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (auth.uid() = driver_id);

-- Create index for better query performance
CREATE INDEX idx_deliveries_customer_id ON public.deliveries(customer_id);
CREATE INDEX idx_deliveries_driver_id ON public.deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_created_at ON public.deliveries(created_at DESC);