-- Create rides table
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  dropoff_location TEXT NOT NULL,
  dropoff_lat DECIMAL(10, 8) NOT NULL,
  dropoff_lng DECIMAL(11, 8) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'driver_en_route', 'driver_arrived', 'in_progress', 'completed', 'cancelled')),
  estimated_price DECIMAL(10, 2),
  final_price DECIMAL(10, 2),
  distance_km DECIMAL(10, 2),
  duration_minutes INTEGER,
  customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  customer_notes TEXT,
  driver_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create driver_subscriptions table
CREATE TABLE public.driver_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  car_number TEXT NOT NULL,
  license_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_color TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'suspended')),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_locations table for real-time tracking
CREATE TABLE public.driver_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed_kmh DECIMAL(5, 2),
  is_available BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rides
CREATE POLICY "Customers can view their own rides"
  ON public.rides FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Drivers can view their assigned rides"
  ON public.rides FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Customers can create rides"
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Drivers can update their assigned rides"
  ON public.rides FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Customers can cancel their pending rides"
  ON public.rides FOR UPDATE
  USING (auth.uid() = customer_id AND status = 'pending');

-- RLS Policies for driver_subscriptions
CREATE POLICY "Drivers can view their own subscription"
  ON public.driver_subscriptions FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create their own subscription"
  ON public.driver_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own subscription"
  ON public.driver_subscriptions FOR UPDATE
  USING (auth.uid() = driver_id);

-- RLS Policies for driver_locations
CREATE POLICY "Everyone can view available driver locations"
  ON public.driver_locations FOR SELECT
  USING (is_available = true);

CREATE POLICY "Drivers can insert their own location"
  ON public.driver_locations FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can modify their own location"
  ON public.driver_locations FOR UPDATE
  USING (auth.uid() = driver_id);

-- Indexes for performance
CREATE INDEX idx_rides_customer_id ON public.rides(customer_id);
CREATE INDEX idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_driver_subscriptions_driver_id ON public.driver_subscriptions(driver_id);
CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX idx_driver_locations_available ON public.driver_locations(is_available);

-- Trigger for updated_at on driver_subscriptions
CREATE TRIGGER update_driver_subscriptions_updated_at
  BEFORE UPDATE ON public.driver_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for rides
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER TABLE public.rides REPLICA IDENTITY FULL;

-- Enable realtime for driver_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;