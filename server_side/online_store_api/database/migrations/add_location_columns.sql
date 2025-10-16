-- Migration: Add latitude and longitude columns to users table
-- This migration adds location columns for map functionality

-- Add latitude and longitude columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);

-- Add check constraint to ensure valid coordinates
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_latitude_check 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_longitude_check 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
