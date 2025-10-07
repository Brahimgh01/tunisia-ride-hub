-- Add missing columns to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'customer';
  END IF;
END $$;

-- Create ride_chat_messages table
CREATE TABLE IF NOT EXISTS ride_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'driver')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on ride_chat_messages
ALTER TABLE ride_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages for their rides" ON ride_chat_messages;
DROP POLICY IF EXISTS "Users can send messages for their rides" ON ride_chat_messages;

-- RLS policies for ride_chat_messages
CREATE POLICY "Users can view messages for their rides" ON ride_chat_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_chat_messages.ride_id 
      AND (rides.customer_id = auth.uid() OR rides.driver_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages for their rides" ON ride_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_chat_messages.ride_id 
      AND (rides.customer_id = auth.uid() OR rides.driver_id = auth.uid())
    )
  );

-- Create ride_ratings table
CREATE TABLE IF NOT EXISTS ride_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ride_ratings_ride_id_user_id_key'
  ) THEN
    ALTER TABLE ride_ratings ADD CONSTRAINT ride_ratings_ride_id_user_id_key UNIQUE (ride_id, user_id);
  END IF;
END $$;

-- Enable RLS on ride_ratings
ALTER TABLE ride_ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own ratings" ON ride_ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings" ON ride_ratings;

-- RLS policies for ride_ratings
CREATE POLICY "Users can view their own ratings" ON ride_ratings
  FOR SELECT USING (user_id = auth.uid() OR driver_id = auth.uid());

CREATE POLICY "Users can insert their own ratings" ON ride_ratings
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update driver_profiles to add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_profiles' AND column_name='license_plate_number') THEN
    ALTER TABLE driver_profiles ADD COLUMN license_plate_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_profiles' AND column_name='is_available') THEN
    ALTER TABLE driver_profiles ADD COLUMN is_available boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='driver_profiles' AND column_name='last_location') THEN
    ALTER TABLE driver_profiles ADD COLUMN last_location jsonb;
  END IF;
END $$;

-- Create indexes for real-time subscriptions
CREATE INDEX IF NOT EXISTS idx_ride_chat_messages_ride_id ON ride_chat_messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_ratings_ride_id ON ride_ratings(ride_id);

-- Enable realtime for chat messages (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ride_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ride_chat_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;