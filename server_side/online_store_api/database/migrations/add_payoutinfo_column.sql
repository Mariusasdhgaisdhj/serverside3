-- Migration: Add payoutinfo column to users table
-- This migration adds the missing payoutinfo field for seller payout information

-- Add payoutinfo JSONB column
ALTER TABLE users ADD COLUMN IF NOT EXISTS payoutinfo JSONB;

-- Add comment to document the payoutinfo structure
COMMENT ON COLUMN users.payoutinfo IS 'JSON object containing seller payout information: gcashName, gcashNumber, paypalEmail, etc.';
