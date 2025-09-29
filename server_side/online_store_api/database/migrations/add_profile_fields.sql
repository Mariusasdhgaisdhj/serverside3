-- Migration: Add profile fields to users table
-- This migration adds the missing profilepicture and addressinfo fields

-- Add profilepicture column
ALTER TABLE users ADD COLUMN IF NOT EXISTS profilepicture VARCHAR(500);

-- Add addressinfo JSONB column
ALTER TABLE users ADD COLUMN IF NOT EXISTS addressinfo JSONB;

-- Add comment to document the addressinfo structure
COMMENT ON COLUMN users.addressinfo IS 'JSON object containing user profile information: firstName, lastName, phone, street, city, state, postalCode, country';

-- Add comment to document the profilepicture field
COMMENT ON COLUMN users.profilepicture IS 'URL or filename of user profile picture';
