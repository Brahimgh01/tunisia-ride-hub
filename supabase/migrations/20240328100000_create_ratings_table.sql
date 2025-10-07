CREATE TABLE ratings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE, -- Changed BIGINT to UUID
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT
);

-- Add a unique constraint to prevent a user from rating a ride more than once
ALTER TABLE ratings ADD CONSTRAINT unique_ride_customer_rating UNIQUE (ride_id, customer_id);
