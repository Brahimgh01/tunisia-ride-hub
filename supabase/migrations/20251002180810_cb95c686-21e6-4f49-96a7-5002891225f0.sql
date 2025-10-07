-- Enable RLS on any tables that might be missing it
ALTER TABLE IF EXISTS ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS driver_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for ratings table if it doesn't have any
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ratings' AND policyname = 'Users can view ratings') THEN
    CREATE POLICY "Users can view ratings" ON ratings
      FOR SELECT USING (customer_id = auth.uid() OR driver_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ratings' AND policyname = 'Users can insert ratings') THEN
    CREATE POLICY "Users can insert ratings" ON ratings
      FOR INSERT WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;