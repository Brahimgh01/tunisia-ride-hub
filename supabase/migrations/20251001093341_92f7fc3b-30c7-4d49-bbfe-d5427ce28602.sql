-- Add is_admin flag to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set admin for the specific email
-- This will be done after the user signs up with brahimghaouar10@gmail.com

-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1),
    FALSE
  );
$$;

-- Add promo_codes table improvements
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS min_ride_value NUMERIC DEFAULT 0;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 1;

-- Create promo code usage tracking table
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discount_applied NUMERIC NOT NULL
);

ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own promo usage"
ON public.promo_code_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert promo usage"
ON public.promo_code_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create referral system
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  bonus_points INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_id, referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- Add referral code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generate referral codes for existing users
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create trip sharing for safety feature
CREATE TABLE IF NOT EXISTS public.trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  shared_with_name TEXT,
  shared_with_phone TEXT,
  shared_with_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage their trip shares"
ON public.trip_shares FOR ALL
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Anyone can view active trip shares with valid token"
ON public.trip_shares FOR SELECT
USING (is_active = TRUE AND expires_at > NOW());

-- Add surge pricing configuration
CREATE TABLE IF NOT EXISTS public.surge_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

ALTER TABLE public.surge_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active surge pricing"
ON public.surge_pricing FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Admins can manage surge pricing"
ON public.surge_pricing FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_customer_id ON public.rides(customer_id);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON public.rides(created_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_available ON public.driver_locations(is_available);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes(code, is_active);

-- Add ride cancellation reason
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- Add applied promo code to rides
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id);
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;