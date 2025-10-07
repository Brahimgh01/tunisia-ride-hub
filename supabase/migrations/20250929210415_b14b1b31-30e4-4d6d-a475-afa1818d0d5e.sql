-- Add new fields to rides table for enhanced features
ALTER TABLE rides ADD COLUMN IF NOT EXISTS ride_type text DEFAULT 'taxi';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS scheduled_time timestamp with time zone;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_preferences jsonb DEFAULT '{}'::jsonb;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false;

-- Add constraint for ride types
ALTER TABLE rides ADD CONSTRAINT valid_ride_type 
  CHECK (ride_type IN ('taxi', 'premium', 'carpooling', 'motorcycle'));

-- Add constraint for payment methods
ALTER TABLE rides ADD CONSTRAINT valid_payment_method 
  CHECK (payment_method IN ('cash', 'konnect', 'edinar', 'card'));

-- Create favorite locations table
CREATE TABLE IF NOT EXISTS favorite_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  location_type text DEFAULT 'other',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_location_type CHECK (location_type IN ('home', 'work', 'other'))
);

-- Enable RLS on favorite_locations
ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for favorite_locations
CREATE POLICY "Users can manage their own favorite locations"
  ON favorite_locations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed'))
);

-- Enable RLS on promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- RLS policy for promo_codes (everyone can view active codes)
CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Create loyalty points table
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  total_earned integer DEFAULT 0 NOT NULL,
  total_redeemed integer DEFAULT 0 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Enable RLS on loyalty_points
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_points
CREATE POLICY "Users can view their own loyalty points"
  ON loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own loyalty points"
  ON loyalty_points FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_time ON rides(scheduled_time) WHERE is_scheduled = true;
CREATE INDEX IF NOT EXISTS idx_favorite_locations_user_id ON favorite_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;