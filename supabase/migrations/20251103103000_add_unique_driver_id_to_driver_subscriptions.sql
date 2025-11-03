-- Add a unique constraint on driver_id for upsert support
ALTER TABLE driver_subscriptions
ADD CONSTRAINT driver_subscriptions_driver_id_key UNIQUE (driver_id);
