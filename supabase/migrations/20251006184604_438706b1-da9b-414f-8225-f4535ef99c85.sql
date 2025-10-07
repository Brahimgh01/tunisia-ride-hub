-- Add subscription trial fields to driver_subscriptions table
ALTER TABLE driver_subscriptions 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 50.00;

-- Update existing subscriptions to set trial info for new registrations
-- This will be handled by the application code