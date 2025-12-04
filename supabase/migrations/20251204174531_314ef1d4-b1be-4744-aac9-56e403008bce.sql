-- Delete all data related to non-admin users first
-- Admin user_id: 9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26

-- Delete driver-related data
DELETE FROM driver_profiles WHERE driver_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';
DELETE FROM driver_locations WHERE driver_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';
DELETE FROM driver_subscriptions WHERE driver_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';

-- Delete ride-related data
DELETE FROM ride_chat_messages;
DELETE FROM ride_ratings;
DELETE FROM ratings;
DELETE FROM trip_shares;
DELETE FROM promo_code_usage;
DELETE FROM notifications;
DELETE FROM deliveries;
DELETE FROM rides;

-- Delete user data
DELETE FROM referrals;
DELETE FROM loyalty_points WHERE user_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';
DELETE FROM favorite_locations WHERE user_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';
DELETE FROM user_roles WHERE user_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';
DELETE FROM profiles WHERE user_id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';

-- Finally delete from auth.users
DELETE FROM auth.users WHERE id != '9a95ff29-b6ab-4104-8b01-2d3c0d3f3a26';