-- Fix 1: Update user_roles RLS policies to prevent infinite recursion
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

-- Allow users to insert their own role during signup (called by trigger)
CREATE POLICY "Users can insert own role during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all roles using security definer function
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Update handle_new_user to prevent duplicate inserts and handle errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role from metadata, default to 'customer'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- Insert into profiles table (with conflict handling)
  INSERT INTO public.profiles (user_id, full_name, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert role into user_roles table (with conflict handling)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- If role is driver, also create driver_profile
  IF user_role = 'driver' THEN
    INSERT INTO public.driver_profiles (driver_id, is_verified, is_available)
    VALUES (NEW.id, false, false)
    ON CONFLICT (driver_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix 3: Enable real-time for rides table
ALTER TABLE public.rides REPLICA IDENTITY FULL;

-- Add rides to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'rides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
  END IF;
END $$;

-- Fix 4: Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('ride_request', 'ride_accepted', 'ride_started', 'ride_completed', 'ride_cancelled')),
  ride_id uuid REFERENCES public.rides(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable real-time for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Fix 5: Add trigger to create notifications on ride status changes
CREATE OR REPLACE FUNCTION public.notify_ride_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify customer when driver accepts
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Accepted',
      'Your ride has been accepted by a driver!',
      'ride_accepted',
      NEW.id
    );
  END IF;
  
  -- Notify customer when driver arrives
  IF NEW.status = 'driver_arrived' AND OLD.status != 'driver_arrived' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Driver Arrived',
      'Your driver has arrived at the pickup location.',
      'ride_started',
      NEW.id
    );
  END IF;
  
  -- Notify customer when ride starts
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Started',
      'Your ride is now in progress.',
      'ride_started',
      NEW.id
    );
  END IF;
  
  -- Notify customer when ride completes
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Completed',
      'Your ride has been completed. Thank you!',
      'ride_completed',
      NEW.id
    );
  END IF;
  
  -- Notify both parties on cancellation
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    INSERT INTO public.notifications (user_id, title, message, type, ride_id)
    VALUES (
      NEW.customer_id,
      'Ride Cancelled',
      'Your ride has been cancelled.',
      'ride_cancelled',
      NEW.id
    );
    
    -- Notify driver if assigned
    IF NEW.driver_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, ride_id)
      VALUES (
        NEW.driver_id,
        'Ride Cancelled',
        'The ride has been cancelled.',
        'ride_cancelled',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ride status changes
DROP TRIGGER IF EXISTS on_ride_status_change ON public.rides;
CREATE TRIGGER on_ride_status_change
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_ride_status_change();