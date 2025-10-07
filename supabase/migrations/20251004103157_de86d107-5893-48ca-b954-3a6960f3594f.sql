-- Update the handle_new_user function to also create driver profile for drivers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  -- Get the role from metadata, default to 'customer'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, full_name, phone, city, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    user_role
  );
  
  -- If role is driver, also create driver_profile
  IF user_role = 'driver' THEN
    INSERT INTO public.driver_profiles (driver_id, is_verified, is_available)
    VALUES (NEW.id, false, false);
  END IF;
  
  RETURN NEW;
END;
$function$;