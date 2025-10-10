-- Add foreign key relationships between rides and profiles
-- This fixes the "Could not find a relationship between 'rides' and 'profiles'" error

ALTER TABLE rides 
  DROP CONSTRAINT IF EXISTS rides_customer_id_fkey,
  ADD CONSTRAINT rides_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES profiles(user_id) 
    ON DELETE CASCADE;

ALTER TABLE rides 
  DROP CONSTRAINT IF EXISTS rides_driver_id_fkey,
  ADD CONSTRAINT rides_driver_id_fkey 
    FOREIGN KEY (driver_id) 
    REFERENCES profiles(user_id) 
    ON DELETE SET NULL;